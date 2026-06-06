import 'server-only';

import { matchCategory } from '@/lib/entries/categorize';
import { categoryLabel } from '@/lib/entries/categories';
import { parseStatementCsv } from '@/lib/entries/csv';
import type { Entry } from '@/lib/entries/mongodb-documents';
import type { EntryRepository, MonthFilter } from '@/lib/entries/repository';
import { statementRowSchema } from '@/lib/entries/schemas';
import { statementRowToDraft, type EntryDraft } from '@/lib/entries/transform';

export class EmptyStatementError extends Error {
  constructor() {
    super('The statement file has no rows to import.');
  }
}

export function createEntryService(repository: EntryRepository) {
  return {
    /**
     * Parses a statement CSV and upserts its rows for the user. Invalid rows are
     * collected as errors rather than aborting the whole import. Idempotent: rows
     * already present (matched by source identifier) are reported as skipped.
     */
    async importStatement(
      userId: string,
      csvText: string,
      options: { baseMonthStart?: Date } = {}
    ): Promise<Entry.ImportSummary> {
      const rows = parseStatementCsv(csvText);

      if (rows.length === 0) {
        throw new EmptyStatementError();
      }

      const drafts: EntryDraft[] = [];
      const errors: Entry.ImportSummary['errors'] = [];

      for (const row of rows) {
        const parsed = statementRowSchema.safeParse(row);
        if (!parsed.success) {
          errors.push({
            line: row.line,
            message: parsed.error.issues[0]?.message ?? 'Invalid row.',
          });
          continue;
        }

        const draft = statementRowToDraft(parsed.data);

        // Reject rows that predate the user's base month: the baseline total
        // already accounts for everything before it, so importing earlier rows
        // would double-count against the running balance.
        if (options.baseMonthStart && draft.competenceAt < options.baseMonthStart) {
          errors.push({
            line: row.line,
            message: 'Before your base month — not imported.',
          });
          continue;
        }

        drafts.push(draft);
      }

      // Apply the user's tagging rules so imported rows land in real categories
      // instead of the `other_*` fallback baked into the draft.
      const rules = await repository.listTaggingRules(userId);
      for (const draft of drafts) {
        const matched = matchCategory(
          draft.description,
          draft.merchant,
          draft.flow,
          rules
        );
        if (matched) draft.category = matched;
      }

      const { inserted, skipped } = await repository.bulkUpsertByExternalId(
        userId,
        drafts
      );

      return { total: rows.length, inserted, skipped, errors };
    },

    listMonthlyStatement(
      userId: string,
      month: MonthFilter
    ): Promise<Entry.Record[]> {
      return repository.listEntriesByMonth(userId, month);
    },

    listAvailableMonths(userId: string): Promise<Entry.MonthOption[]> {
      return repository.listAvailableMonths(userId);
    },

    listTaggingRules(userId: string): Promise<Entry.TaggingRuleRecord[]> {
      return repository.listTaggingRules(userId);
    },

    /**
     * Copies the global default rules into a new user's own rules. Called once at
     * sign-up. Idempotent: does nothing if the user already has rules.
     */
    async seedDefaultRulesForUser(userId: string): Promise<void> {
      const existing = await repository.listTaggingRules(userId);
      if (existing.length > 0) return;

      const defaults = await repository.listDefaultTaggingRules();
      if (defaults.length === 0) return;

      await repository.createManyTaggingRules(userId, defaults);
    },

    createTaggingRule(
      userId: string,
      input: Entry.TaggingRuleInput
    ): Promise<Entry.TaggingRuleRecord> {
      return repository.createTaggingRule(userId, input);
    },

    updateTaggingRule(
      userId: string,
      ruleId: string,
      input: Entry.TaggingRuleInput
    ): Promise<Entry.TaggingRuleRecord | null> {
      return repository.updateTaggingRule(userId, ruleId, input);
    },

    deleteTaggingRule(userId: string, ruleId: string): Promise<boolean> {
      return repository.deleteTaggingRule(userId, ruleId);
    },

    /**
     * Re-applies all of the user's tagging rules to a month's entries. Entries
     * whose matched category differs are updated; non-matching entries are left
     * untouched. Returns how many entries were scanned and changed.
     */
    async applyRulesToMonth(
      userId: string,
      month: MonthFilter
    ): Promise<Entry.ApplyRulesSummary> {
      const [rules, entries] = await Promise.all([
        repository.listTaggingRules(userId),
        repository.listEntriesByMonth(userId, month),
      ]);

      const updates: { id: string; category: Entry.Category }[] = [];
      for (const entry of entries) {
        const matched = matchCategory(
          entry.description,
          entry.merchant,
          entry.flow,
          rules
        );
        if (matched && matched !== entry.category) {
          updates.push({ id: entry.id, category: matched });
        }
      }

      const updated = await repository.bulkSetCategories(userId, updates);
      return { total: entries.length, updated };
    },

    /**
     * Updates a single entry's description and/or category. When the description
     * changes and no explicit category was given, the user's tagging rules are
     * re-run against the new text and a matching category is auto-applied (an
     * explicit category in the same edit always wins). Returns the updated
     * record, or null when the entry doesn't exist for this user.
     */
    async updateEntry(
      userId: string,
      entryId: string,
      input: { description?: string; category?: Entry.Category }
    ): Promise<Entry.Record | null> {
      const fields = { ...input };

      if (input.description !== undefined && input.category === undefined) {
        const [existing, rules] = await Promise.all([
          repository.getEntryById(userId, entryId),
          repository.listTaggingRules(userId),
        ]);

        if (existing) {
          const matched = matchCategory(
            input.description,
            existing.merchant,
            existing.flow,
            rules
          );
          if (matched) fields.category = matched;
        }
      }

      return repository.updateEntryFields(userId, entryId, fields);
    },

    async getMonthlyOutcomesByCategory(
      userId: string,
      month: MonthFilter
    ): Promise<{ category: Entry.Category; label: string; total: number }[]> {
      const raw = await repository.groupOutcomesByCategory(userId, month);
      return raw
        .filter((r) => r.total > 0 && r.category !== 'not_categorized')
        .map((r) => ({
          category: r.category,
          label: categoryLabel(r.category),
          total: r.total,
        }));
    },

    /**
     * Running balance for a month, given the user's base month and baseline total.
     * `startingBalance` is the balance entering the month; `endingBalance` is the
     * balance at its close. Both are the baseline plus the accumulated signed net
     * from the base month, so they stay correct without importing earlier history.
     */
    async computeMonthBalance(
      userId: string,
      baseMonth: MonthFilter,
      baselineTotal: number,
      selectedMonth: MonthFilter
    ): Promise<{ startingBalance: number; endingBalance: number }> {
      const baseStart = monthStart(baseMonth);
      const selectedStart = monthStart(selectedMonth);
      const selectedEnd = monthStart(nextMonth(selectedMonth));

      // Clamp to the base month: ranges before it are empty and contribute 0.
      const startEnd = selectedStart < baseStart ? baseStart : selectedStart;
      const endEnd = selectedEnd < baseStart ? baseStart : selectedEnd;

      const [priorNet, throughNet] = await Promise.all([
        repository.sumNetInRange(userId, baseStart, startEnd),
        repository.sumNetInRange(userId, baseStart, endEnd),
      ]);

      return {
        startingBalance: baselineTotal + priorNet,
        endingBalance: baselineTotal + throughNet,
      };
    },
  };
}

function monthStart({ year, month }: MonthFilter): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

function nextMonth({ year, month }: MonthFilter): MonthFilter {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}
