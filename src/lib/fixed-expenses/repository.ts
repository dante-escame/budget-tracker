import type { FixedExpense } from '@/lib/fixed-expenses/mongodb-documents';

export interface FixedExpenseRepository {
  /** Every signature the user has marked as a fixed expense. */
  listSignatures(userId: string): Promise<FixedExpense.Record[]>;

  /** Marks a signature as fixed (idempotent on the user+signature pair). */
  upsertBySignature(
    userId: string,
    signature: string,
    label: string
  ): Promise<void>;

  /** Clears a fixed-expense mark. Returns whether one was removed. */
  deleteBySignature(userId: string, signature: string): Promise<boolean>;
}
