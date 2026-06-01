import type { ObjectId } from 'mongodb';

export namespace Entry {
  export type PaymentType =
    | 'pix'
    | 'credit_card'
    | 'debit_card'
    | 'boleto'
    | 'ted'
    | 'doc'
    | 'bank_transfer'
    | 'cash'
    | 'other';

  export type Flow = 'income' | 'outcome';

  export type Status = 'pending' | 'confirmed' | 'cancelled' | 'scheduled';

  export type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | 'yearly';

  export type Category =
    // Outcome
    | 'housing'
    | 'food'
    | 'dining'
    | 'transportation'
    | 'health'
    | 'entertainment'
    | 'education'
    | 'shopping'
    | 'personal_care'
    | 'travel'
    | 'subscriptions'
    | 'financial'
    | 'taxes'
    | 'pets'
    | 'gifts'
    | 'other_outcome'
    // Income
    | 'salary'
    | 'freelance'
    | 'investment_return'
    | 'rental_income'
    | 'bonus'
    | 'gift_received'
    | 'refund'
    | 'other_income';

  export interface Tag {
    key: string;
    value: string;
  }

  export interface Installment {
    group_id: ObjectId;
    number: number;
    total: number;
    total_value: number; // in centavos
  }

  export interface Recurrence {
    rule: RecurrenceRule;
    parent_id: ObjectId | null; // null = this is the root occurrence
    ends_at: Date | null;
  }

  export interface Document {
    _id?: ObjectId;
    user_id: ObjectId;

    external_id?: string; // source id from an imported statement (idempotency key)

    description: string;
    short_description: string;
    value: number; // in centavos (integer) — avoids float precision bugs
    flow: Flow;
    type: PaymentType;
    category: Category;
    tags: Tag[];
    currency: string; // ISO 4217, e.g. 'BRL'

    occurred_at: Date;   // actual transaction date
    competence_at: Date; // which budget month this belongs to
    created_at: Date;
    updated_at: Date;

    status: Status;

    installment?: Installment;
    recurrence?: Recurrence;

    merchant?: string;
    notes?: string;
    attachments?: string[];

    deleted_at: Date | null;
  }

  // Serializable view of an entry, safe to pass from Server to Client Components.
  export interface Record {
    id: string;
    description: string;
    shortDescription: string;
    value: number; // absolute centavos
    flow: Flow;
    type: PaymentType;
    category: Category;
    currency: string;
    occurredAt: string; // ISO date
    status: Status;
    merchant: string | null;
  }

  // A month that has at least one entry, used by the month filter dropdown.
  export interface MonthOption {
    year: number;
    month: number; // 1-12
  }

  export interface ImportSummary {
    total: number;
    inserted: number;
    skipped: number;
    errors: { line: number; message: string }[];
  }
}
