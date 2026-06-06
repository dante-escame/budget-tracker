import type { ObjectId } from 'mongodb';

import type { Entry } from '@/lib/entries/mongodb-documents';

export namespace BaseData {
  /**
   * Per-user "base data" config: the first month the user starts tracking and the
   * account balance at the close of the month *before* it. Together they let the
   * app show a correct running balance without importing the full account history.
   * One document per user (unique on `user_id`).
   */
  export interface Document {
    _id?: ObjectId;
    user_id: ObjectId;

    base_year: number;
    base_month: number; // 1-12

    // Account balance at the end of the month before the base month, in centavos.
    baseline_total: number;
    currency: string; // ISO 4217, e.g. 'BRL'

    created_at: Date;
    updated_at: Date;
  }

  // A base month, reusing the shared month shape.
  export type MonthOption = Entry.MonthOption;

  // Serializable view, safe to pass from Server to Client Components.
  export interface Record {
    baseMonth: MonthOption;
    baselineTotal: number; // centavos
    currency: string;
  }

  // Input accepted when setting base data.
  export interface Input {
    baseMonth: MonthOption;
    baselineTotal: number; // centavos
    currency: string;
  }
}
