import 'server-only';

import { ObjectId, type WithId } from 'mongodb';

import { getFixedExpenseCollections } from '@/lib/fixed-expenses/mongodb-collections';
import type { FixedExpense } from '@/lib/fixed-expenses/mongodb-documents';
import type { FixedExpenseRepository } from '@/lib/fixed-expenses/repository';

export async function createMongoFixedExpenseRepository(): Promise<FixedExpenseRepository> {
  const collections = await getFixedExpenseCollections();

  return {
    async listSignatures(userId): Promise<FixedExpense.Record[]> {
      const documents = await collections.fixedExpenses
        .find({ user_id: parseObjectId(userId) })
        .toArray();

      return documents.map(mapFixedExpenseRecord);
    },

    async upsertBySignature(userId, signature, label): Promise<void> {
      const now = new Date();
      await collections.fixedExpenses.updateOne(
        { user_id: parseObjectId(userId), signature },
        {
          // user_id and signature come from the equality filter on insert;
          // repeating them in $setOnInsert would trigger a Mongo path conflict.
          $set: { label, updated_at: now },
          $setOnInsert: { created_at: now },
        },
        { upsert: true }
      );
    },

    async deleteBySignature(userId, signature): Promise<boolean> {
      const result = await collections.fixedExpenses.deleteOne({
        user_id: parseObjectId(userId),
        signature,
      });

      return result.deletedCount === 1;
    },
  };
}

function mapFixedExpenseRecord(
  document: WithId<FixedExpense.Document>
): FixedExpense.Record {
  return {
    id: document._id.toHexString(),
    signature: document.signature,
    label: document.label,
  };
}

function parseObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId value: ${value}`);
  }

  return new ObjectId(value);
}
