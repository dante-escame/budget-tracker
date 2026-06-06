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

  // Where an entry came from. Bank-statement imports (and manual entries) leave
  // this undefined; credit-card bill imports tag rows as 'credit_card_bill' so
  // they can be grouped under a bill and shown on the Credit Cards page.
  export type Source = 'bank_statement' | 'credit_card_bill';

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
    | 'investment'
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

    source?: Source;      // origin of the entry; undefined = bank_statement
    bill_id?: ObjectId;   // credit-card bill this line item belongs to, if any

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
    source?: Source;
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

  // How a tagging rule's pattern is compared against a transaction's text.
  // Kept minimal for now; 'regex'/'starts_with' can be added later.
  export type RuleMatchType = 'contains';

  // A user-managed rule that auto-assigns a category to transactions whose
  // text matches `pattern`. Stored per user in the `entry_tagging_rules`
  // collection and applied on import and via "Apply All Rules".
  export interface TaggingRule {
    _id?: ObjectId;
    user_id: ObjectId;
    pattern: string; // matched against merchant + description
    match_type: RuleMatchType;
    category: Category;
    flow: Flow | null; // optional constraint; null = applies to any flow
    priority: number; // lower is evaluated first; first match wins
    created_at: Date;
    updated_at: Date;
  }

  // Serializable view of a tagging rule, safe to pass to Client Components.
  export interface TaggingRuleRecord {
    id: string;
    pattern: string;
    matchType: RuleMatchType;
    category: Category;
    flow: Flow | null;
    priority: number;
  }

  // Input accepted when creating or updating a tagging rule.
  export interface TaggingRuleInput {
    pattern: string;
    matchType: RuleMatchType;
    category: Category;
    flow: Flow | null;
    priority?: number;
  }

  // A global default rule (no user_id). The `default_tagging_rules` collection
  // holds these and they are copied into each user's own rules at sign-up.
  export interface DefaultTaggingRule {
    _id?: ObjectId;
    pattern: string;
    match_type: RuleMatchType;
    category: Category;
    flow: Flow | null;
    priority: number;
    created_at: Date;
    updated_at: Date;
  }

  // Result of applying all of a user's rules to a month of entries.
  export interface ApplyRulesSummary {
    total: number;
    updated: number;
  }
}
