import 'server-only';

import { matchCategory } from '@/lib/entries/categorize';
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
      csvText: string
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

        drafts.push(statementRowToDraft(parsed.data));
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
  };
}
