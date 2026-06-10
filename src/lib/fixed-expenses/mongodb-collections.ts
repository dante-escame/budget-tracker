import 'server-only';

import type { Collection, Db } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import type { FixedExpense } from '@/lib/fixed-expenses/mongodb-documents';

export interface FixedExpenseCollections {
  fixedExpenses: Collection<FixedExpense.Document>;
}

declare global {
  var __fixedExpenseIndexesPromise__: Promise<void> | undefined;
}

export async function getFixedExpenseCollections(): Promise<FixedExpenseCollections> {
  const db = await getMongoDb();
  const collections = createFixedExpenseCollections(db);

  if (!globalThis.__fixedExpenseIndexesPromise__) {
    globalThis.__fixedExpenseIndexesPromise__ = ensureFixedExpenseIndexes(
      collections
    ).catch((error) => {
      globalThis.__fixedExpenseIndexesPromise__ = undefined;
      throw error;
    });
  }

  await globalThis.__fixedExpenseIndexesPromise__;

  return collections;
}

function createFixedExpenseCollections(db: Db): FixedExpenseCollections {
  return {
    fixedExpenses: db.collection<FixedExpense.Document>('fixed_expenses'),
  };
}

async function ensureFixedExpenseIndexes(
  collections: FixedExpenseCollections
): Promise<void> {
  // A signature can be marked fixed at most once per user; the upsert relies on
  // this uniqueness to stay idempotent.
  await collections.fixedExpenses.createIndexes([
    {
      key: { user_id: 1, signature: 1 },
      name: 'fixed_expenses_user_signature',
      unique: true,
    },
  ]);
}
