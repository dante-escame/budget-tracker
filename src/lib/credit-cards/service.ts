import 'server-only';

import { matchCategory } from '@/lib/entries/categorize';
import { parseCreditCardCsv } from '@/lib/credit-cards/csv';
import { creditCardRowSchema, type CreditCardRowFields } from '@/lib/credit-cards/schemas';
import type { CreditCard } from '@/lib/credit-cards/mongodb-documents';
import type { CreditCardRepository, MonthFilter } from '@/lib/credit-cards/repository';
import { creditCardRowsToDrafts } from '@/lib/credit-cards/transform';
import { pickSuggestedPayment } from '@/lib/credit-cards/matching';

export class EmptyBillError extends Error {
  constructor() {
    super('The credit-card bill file has no rows to import.');
  }
}

export interface ImportBillInput {
  cardLabel: string;
  billMonth: MonthFilter;
  csvText: string;
}

export function createCreditCardService(repository: CreditCardRepository) {
  return {
    /**
     * Parses a fatura CSV and upserts its rows for a card + month. Invalid rows are
     * collected as errors rather than aborting. Idempotent (rows already present are
     * skipped). After upserting, recomputes the bill total and suggests the
     * bank-statement payment that likely settled it for the user to confirm.
     */
    async importBill(
      userId: string,
      { cardLabel, billMonth, csvText }: ImportBillInput
    ): Promise<CreditCard.ImportSummary> {
      const rows = parseCreditCardCsv(csvText);
      if (rows.length === 0) {
        throw new EmptyBillError();
      }

      const valid: CreditCardRowFields[] = [];
      const errors: CreditCard.ImportSummary['errors'] = [];

      for (const row of rows) {
        const parsed = creditCardRowSchema.safeParse(row);
        if (!parsed.success) {
          errors.push({
            line: row.line,
            message: parsed.error.issues[0]?.message ?? 'Invalid row.',
          });
          continue;
        }
        valid.push(parsed.data);
      }

      const drafts = creditCardRowsToDrafts(valid, { cardLabel, billMonth });

      // Auto-categorize using the user's tagging rules, like the statement import.
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

      const { billId } = await repository.upsertBill(userId, cardLabel, billMonth);
      const { inserted, skipped } = await repository.bulkUpsertCardEntries(
        userId,
        billId,
        drafts
      );
      const total = await repository.recomputeBillTotal(userId, billId);

      const candidates = await repository.listPaymentCandidates(userId, billId);
      const suggestedPayment = pickSuggestedPayment(candidates, total);

      return {
        billId,
        cardLabel,
        competence: billMonth,
        total,
        inserted,
        skipped,
        errors,
        suggestedPayment,
      };
    },

    listBills(userId: string): Promise<CreditCard.BillSummary[]> {
      return repository.listBills(userId);
    },

    getBill(userId: string, cardLabel: string, billMonth: MonthFilter) {
      return repository.getBill(userId, cardLabel, billMonth);
    },

    listPaymentCandidates(
      userId: string,
      billId: string
    ): Promise<CreditCard.PaymentCandidate[]> {
      return repository.listPaymentCandidates(userId, billId);
    },

    linkPayment(
      userId: string,
      billId: string,
      paymentEntryId: string | null
    ): Promise<CreditCard.BillRecord | null> {
      return repository.linkPayment(userId, billId, paymentEntryId);
    },
  };
}
