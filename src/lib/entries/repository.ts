import type { Entry } from '@/lib/entries/mongodb-documents';
import type { EntryDraft } from '@/lib/entries/transform';

export interface BulkUpsertResult {
  inserted: number;
  skipped: number;
}

export interface MonthFilter {
  year: number;
  month: number; // 1-12
}

export interface EntryRepository {
  /**
   * Upserts drafts keyed by (user_id, external_id). Existing rows are left
   * untouched, making re-imports idempotent. Returns how many were newly
   * inserted vs. skipped (already present).
   */
  bulkUpsertByExternalId(
    userId: string,
    drafts: EntryDraft[]
  ): Promise<BulkUpsertResult>;

  /** Non-deleted entries for a user within a competence month, newest first. */
  listEntriesByMonth(
    userId: string,
    month: MonthFilter
  ): Promise<Entry.Record[]>;

  /** Distinct months (by competence) that have at least one entry, newest first. */
  listAvailableMonths(userId: string): Promise<Entry.MonthOption[]>;
}
