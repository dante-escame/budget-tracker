import type { ObjectId } from 'mongodb';

import type { Entry } from '@/lib/entries/mongodb-documents';

export namespace CreditCard {
  /**
   * A single credit-card bill (fatura) for one card in one closing-date month.
   * Identified per user by `(card_label, competence_at)`. The bill's line items
   * live in the shared `entries` collection (tagged `source: 'credit_card_bill'`
   * and pointing back here via `bill_id`); this document holds the bill-level
   * total, paid status, and the link to the bank-statement payment.
   */
  export interface Bill {
    _id?: ObjectId;
    user_id: ObjectId;

    card_label: string;
    competence_at: Date; // first day of the bill month, UTC midnight
    currency: string; // ISO 4217, e.g. 'BRL'

    // Sum of the bill's charges in centavos, EXCLUDING the "Pagamento recebido"
    // credit line. Recomputed on every import.
    total: number;

    paid_at: Date | null;
    linked_payment_entry_id: ObjectId | null; // bank-statement "pagamento de fatura"

    created_at: Date;
    updated_at: Date;
  }

  // Serializable view of a bill, safe to pass from Server to Client Components.
  export interface BillRecord {
    id: string;
    cardLabel: string;
    competence: MonthOption;
    currency: string;
    total: number; // centavos, excludes the payment-received line
    paidAt: string | null; // ISO date
    linkedPayment: LinkedPayment | null;
  }

  // The bank-statement payment a bill is linked to (the "origin" of the payment).
  export interface LinkedPayment {
    entryId: string;
    description: string;
    occurredAt: string; // ISO date
    value: number; // centavos
  }

  // A candidate bank-statement payment for the manual link/confirm step.
  export interface PaymentCandidate {
    entryId: string;
    description: string;
    occurredAt: string; // ISO date
    value: number; // centavos
  }

  // A bill month, used by the month filter dropdown. Reuses the Entry shape.
  export type MonthOption = Entry.MonthOption;

  // One entry in the card + month selectors on the Credit Cards page.
  export interface BillSummary {
    id: string;
    cardLabel: string;
    competence: MonthOption;
    total: number;
    paid: boolean;
  }

  export interface ImportSummary {
    billId: string;
    cardLabel: string;
    competence: MonthOption;
    total: number;
    inserted: number;
    skipped: number;
    errors: { line: number; message: string }[];
    // Best automatic guess for the bank-statement payment that settled this bill,
    // surfaced for the user to confirm. Null when nothing plausible was found.
    suggestedPayment: PaymentCandidate | null;
  }
}
