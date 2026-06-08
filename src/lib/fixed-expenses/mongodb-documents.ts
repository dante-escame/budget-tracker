import type { ObjectId } from 'mongodb';

export namespace FixedExpense {
  // A user-marked recurring expense. Stored per user in the `fixed_expenses`
  // collection, keyed by `signature` so future imports of the same merchant are
  // recognised. Intentionally independent from the tagging-rules system.
  export interface Document {
    _id?: ObjectId;
    user_id: ObjectId;
    signature: string; // normalized merchant/description (see signature.ts)
    label: string; // human-readable name shown to the user
    created_at: Date;
    updated_at: Date;
  }

  // Serializable view, safe to pass from Server to Client Components.
  export interface Record {
    id: string;
    signature: string;
    label: string;
  }
}
