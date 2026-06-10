import 'server-only';

import type { createEntryService } from '@/lib/entries/service';
import type { FixedExpense } from '@/lib/fixed-expenses/mongodb-documents';
import type { FixedExpenseRepository } from '@/lib/fixed-expenses/repository';
import { fixedExpenseSignature } from '@/lib/fixed-expenses/signature';

type EntryService = ReturnType<typeof createEntryService>;

export function createFixedExpenseService(
  repository: FixedExpenseRepository,
  entryService: EntryService
) {
  return {
    listSignatures(userId: string): Promise<FixedExpense.Record[]> {
      return repository.listSignatures(userId);
    },

    /**
     * Marks the given entry's merchant/description signature as a fixed expense.
     * Every current and future entry sharing that signature then reads as fixed.
     * Returns false when the entry doesn't exist.
     */
    async markEntryAsFixed(userId: string, entryId: string): Promise<boolean> {
      const entry = await entryService.getEntry(userId, entryId);
      if (!entry) return false;

      const signature = fixedExpenseSignature(entry.merchant, entry.description);
      const label = entry.merchant?.trim() || entry.shortDescription;
      await repository.upsertBySignature(userId, signature, label);
      return true;
    },

    /** Clears the fixed-expense mark derived from the given entry. */
    async unmarkEntry(userId: string, entryId: string): Promise<boolean> {
      const entry = await entryService.getEntry(userId, entryId);
      if (!entry) return false;

      const signature = fixedExpenseSignature(entry.merchant, entry.description);
      await repository.deleteBySignature(userId, signature);
      return true;
    },
  };
}
