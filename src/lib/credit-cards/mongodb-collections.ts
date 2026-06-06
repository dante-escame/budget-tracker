import 'server-only';

import type { Collection, Db } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import type { CreditCard } from '@/lib/credit-cards/mongodb-documents';

export interface CreditCardCollections {
  bills: Collection<CreditCard.Bill>;
}

declare global {
  var __creditCardIndexesPromise__: Promise<void> | undefined;
}

export async function getCreditCardCollections(): Promise<CreditCardCollections> {
  const db = await getMongoDb();
  const collections = createCreditCardCollections(db);

  if (!globalThis.__creditCardIndexesPromise__) {
    globalThis.__creditCardIndexesPromise__ = ensureCreditCardIndexes(collections);
  }

  await globalThis.__creditCardIndexesPromise__;

  return collections;
}

function createCreditCardCollections(db: Db): CreditCardCollections {
  return {
    bills: db.collection<CreditCard.Bill>('credit_card_bills'),
  };
}

async function ensureCreditCardIndexes(
  collections: CreditCardCollections
): Promise<void> {
  await collections.bills.createIndexes([
    {
      // One bill per card per closing-date month, per user.
      key: { user_id: 1, card_label: 1, competence_at: 1 },
      name: 'credit_card_bills_user_card_competence',
      unique: true,
    },
    {
      key: { user_id: 1, competence_at: -1 },
      name: 'credit_card_bills_user_competence',
    },
  ]);
}
