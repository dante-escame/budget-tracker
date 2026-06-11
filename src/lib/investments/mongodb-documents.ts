import type { ObjectId } from 'mongodb';

export namespace Investment {
  export type Category =
    | 'fixed_income'
    | 'crypto'
    | 'dollar'
    | 'stocks'
    | 'reits';

  // Three-level risk, rendered green / yellow / red in the UI.
  export type Risk = 'low' | 'medium' | 'high';

  // A wallet position. `current_value` is the manually-maintained market value;
  // `Total Applied` and `Last Application` are derived from this position's
  // applications, not stored here.
  export interface PositionDocument {
    _id?: ObjectId;
    user_id: ObjectId;
    name: string;
    category: Category;
    type: string; // free-form, category-dependent (Selic, Banking, Stable Coin…)
    risk: Risk;
    current_value: number; // centavos; 0 until the user sets a market value
    // For crypto positions the value is derived from a live quote: `coin_symbol`
    // (e.g. 'BTC') × `quantity` × daily BRL price. Dollar positions reuse
    // `quantity` (held USD) × the live USD→BRL rate, with no `coin_symbol`.
    // Stock/FII positions reuse `quantity` (shares held) × the live B3 price and
    // store the B3 ticker (e.g. 'PETR4') in `ticker_symbol`. Null/absent for
    // other assets.
    coin_symbol?: string | null;
    ticker_symbol?: string | null;
    quantity?: number | null;
    currency: string; // ISO 4217, e.g. 'BRL'
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }

  // A single application (aporte or return) into/from a position. Each one
  // mirrors a linked entry in the `entries` collection (`entry_id`).
  export interface ApplicationDocument {
    _id?: ObjectId;
    user_id: ObjectId;
    investment_id: ObjectId;
    value: number; // centavos
    flow: 'income' | 'outcome';
    applied_at: Date;
    entry_id: ObjectId; // linked statement entry
    // 'application' = entry was created by this record; 'statement_entry' = pre-existing entry linked by the user.
    source: 'application' | 'statement_entry';
    created_at: Date;
  }

  // Serializable position with computed totals, safe for Client Components.
  export interface PositionRecord {
    id: string;
    name: string;
    category: Category;
    type: string;
    risk: Risk;
    currentValue: number; // centavos (market value, or total applied fallback)
    storedCurrentValue: number; // raw stored market value — 0 means "not explicitly set"
    coinSymbol?: string | null; // crypto only — selected coin (e.g. 'BTC')
    tickerSymbol?: string | null; // stocks/reits only — B3 ticker (e.g. 'PETR4')
    quantity?: number | null; // crypto/dollar/stocks/reits — amount held
    totalApplied: number; // centavos, sum of applications
    lastApplicationAt: string | null; // ISO date
    sharePct: number; // 0..100 of wallet by currentValue
    currency: string;
  }

  // Serializable application row for the history table.
  export interface ApplicationRecord {
    id: string;
    // null for entries manually tagged 'investment' in the statement (no linked position).
    investmentId: string | null;
    investmentName: string;
    // Original entry description, present only for statement_entry rows so the
    // user can identify the transaction before assigning it to a position.
    entryDescription?: string;
    value: number; // centavos
    flow: 'income' | 'outcome';
    appliedAt: string; // ISO date
    // 'application' = created via the investments form; 'statement_entry' = outcome
    // entry whose category was set to 'investment' in the statement view.
    source: 'application' | 'statement_entry';
  }
}
