import type { Investment } from '@/lib/investments/mongodb-documents';

// A position with its stored fields only — the service layers on the computed
// totals (total applied, last application, share %) to build a PositionRecord.
export interface PositionBase {
  id: string;
  name: string;
  category: Investment.Category;
  type: string;
  risk: Investment.Risk;
  currentValue: number; // raw stored market value in centavos (may be 0)
  currency: string;
}

export interface CreatePositionInput {
  name: string;
  category: Investment.Category;
  type: string;
  risk: Investment.Risk;
  currentValue: number; // centavos
  currency: string;
}

export interface UpdatePositionInput {
  name?: string;
  category?: Investment.Category;
  type?: string;
  risk?: Investment.Risk;
  currentValue?: number; // centavos
}

export interface CreateApplicationInput {
  investmentId: string;
  value: number; // centavos
  flow: 'income' | 'outcome';
  appliedAt: Date;
  entryId: string; // linked statement entry id
  source: 'application' | 'statement_entry';
}

export interface InvestmentRepository {
  /** Non-deleted positions for a user. */
  listPositions(userId: string): Promise<PositionBase[]>;

  /** A single non-deleted position, or null when missing. */
  getPosition(userId: string, id: string): Promise<PositionBase | null>;

  createPosition(userId: string, input: CreatePositionInput): Promise<PositionBase>;

  updatePosition(
    userId: string,
    id: string,
    input: UpdatePositionInput
  ): Promise<PositionBase | null>;

  /** Soft-deletes a position. Returns whether one was removed. */
  softDeletePosition(userId: string, id: string): Promise<boolean>;

  /** All applications for a user, newest first, joined with position name. */
  listApplications(userId: string): Promise<Investment.ApplicationRecord[]>;

  createApplication(
    userId: string,
    input: CreateApplicationInput
  ): Promise<void>;

  /**
   * Deletes a single application. Returns the linked entry id and source so the
   * caller can decide whether to soft-delete it, or null when the application
   * doesn't exist.
   */
  deleteApplication(
    userId: string,
    appId: string
  ): Promise<{ entryId: string; source: 'application' | 'statement_entry' } | null>;

  /** Linked entry ids and sources of every application of a position (for cascade delete). */
  listApplicationEntryIdsForPosition(
    userId: string,
    positionId: string
  ): Promise<{ entryId: string; source: 'application' | 'statement_entry' }[]>;

  /** Removes every application of a position. */
  deleteApplicationsForPosition(
    userId: string,
    positionId: string
  ): Promise<void>;

  /** Entry ids linked to any of the user's applications (for deduplication). */
  listAllApplicationEntryIds(userId: string): Promise<string[]>;
}
