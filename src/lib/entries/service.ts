import 'server-only';

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
  };
}
