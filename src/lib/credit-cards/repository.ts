import type { MatchableRule } from '@/lib/entries/categorize';
import type { Entry } from '@/lib/entries/mongodb-documents';
import type { BulkUpsertResult } from '@/lib/entries/repository';
import type { CreditCard } from '@/lib/credit-cards/mongodb-documents';
import type { CardEntryDraft } from '@/lib/credit-cards/transform';

export interface MonthFilter {
  year: number;
  month: number; // 1-12
}

export interface CreditCardRepository {
  /** Finds or creates the bill for a card + month. Returns its id and currency. */
  upsertBill(
    userId: string,
    cardLabel: string,
    billMonth: MonthFilter
  ): Promise<{ billId: string; currency: string }>;

  /**
   * Upserts card line-item drafts into the shared `entries` collection keyed by
   * (user_id, external_id), tagging them with `source` and `bill_id`. Idempotent:
   * rows already present are skipped.
   */
  bulkUpsertCardEntries(
    userId: string,
    billId: string,
    drafts: CardEntryDraft[]
  ): Promise<BulkUpsertResult>;

  /** Recomputes and persists a bill's total from its entries. Returns the total. */
  recomputeBillTotal(userId: string, billId: string): Promise<number>;

  /** All of a user's bills, newest month first, for the card + month selectors. */
  listBills(userId: string): Promise<CreditCard.BillSummary[]>;

  /** A bill and its line items, or null when the card + month has no bill. */
  getBill(
    userId: string,
    cardLabel: string,
    billMonth: MonthFilter
  ): Promise<{ bill: CreditCard.BillRecord; entries: Entry.Record[] } | null>;

  /** Bank-statement payment entries that plausibly settle the given bill. */
  listPaymentCandidates(
    userId: string,
    billId: string
  ): Promise<CreditCard.PaymentCandidate[]>;

  /** Links (or clears, when null) a bill's bank-statement payment + paid status. */
  linkPayment(
    userId: string,
    billId: string,
    paymentEntryId: string | null
  ): Promise<CreditCard.BillRecord | null>;

  /** A user's tagging rules as matchable inputs (for auto-categorization). */
  listTaggingRules(userId: string): Promise<MatchableRule[]>;
}
