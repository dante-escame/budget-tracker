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

  /** A single non-deleted entry scoped to the user, or null when not found. */
  getEntryById(userId: string, entryId: string): Promise<Entry.Record | null>;

  /** Distinct months (by competence) that have at least one entry, newest first. */
  listAvailableMonths(userId: string): Promise<Entry.MonthOption[]>;

  /** A user's tagging rules, ordered by ascending priority. */
  listTaggingRules(userId: string): Promise<Entry.TaggingRuleRecord[]>;

  /** The global default rules (from `default_tagging_rules`), as creatable inputs. */
  listDefaultTaggingRules(): Promise<Entry.TaggingRuleInput[]>;

  /** Creates a tagging rule. When priority is omitted it is appended to the end. */
  createTaggingRule(
    userId: string,
    input: Entry.TaggingRuleInput
  ): Promise<Entry.TaggingRuleRecord>;

  /** Inserts several rules at once (used to seed defaults for a new user). */
  createManyTaggingRules(
    userId: string,
    inputs: Entry.TaggingRuleInput[]
  ): Promise<Entry.TaggingRuleRecord[]>;

  /** Updates a rule scoped to the user. Returns null when it doesn't exist. */
  updateTaggingRule(
    userId: string,
    ruleId: string,
    input: Entry.TaggingRuleInput
  ): Promise<Entry.TaggingRuleRecord | null>;

  /** Deletes a rule scoped to the user. Returns whether a rule was removed. */
  deleteTaggingRule(userId: string, ruleId: string): Promise<boolean>;

  /** Sets the category on many of the user's entries at once. Returns the count modified. */
  bulkSetCategories(
    userId: string,
    updates: { id: string; category: Entry.Category }[]
  ): Promise<number>;

  /**
   * Updates a single entry's editable fields (description and/or category) scoped
   * to the user. Recomputes the short description when the description changes.
   * Returns the updated record, or null when the entry doesn't exist.
   */
  updateEntryFields(
    userId: string,
    entryId: string,
    fields: { description?: string; category?: Entry.Category }
  ): Promise<Entry.Record | null>;

  /**
   * Signed net (income minus outcome) in centavos across a user's non-deleted
   * entries whose competence month falls in `[startInclusive, endExclusive)`.
   * Returns 0 when the range holds no entries.
   */
  sumNetInRange(
    userId: string,
    startInclusive: Date,
    endExclusive: Date
  ): Promise<number>;
}
