import 'server-only';

import { ObjectId, type WithId } from 'mongodb';

import { getBaseDataCollections } from '@/lib/base-data/mongodb-collections';
import type { BaseData } from '@/lib/base-data/mongodb-documents';
import type { BaseDataRepository } from '@/lib/base-data/repository';

export async function createMongoBaseDataRepository(): Promise<BaseDataRepository> {
  const collections = await getBaseDataCollections();

  return {
    async getBaseData(userId): Promise<BaseData.Record | null> {
      const document = await collections.baseData.findOne({
        user_id: parseObjectId(userId),
      });

      return document ? mapBaseDataRecord(document) : null;
    },

    async upsertBaseData(userId, input): Promise<BaseData.Record> {
      const now = new Date();

      const document = await collections.baseData.findOneAndUpdate(
        { user_id: parseObjectId(userId) },
        {
          $set: {
            base_year: input.baseMonth.year,
            base_month: input.baseMonth.month,
            baseline_total: input.baselineTotal,
            currency: input.currency,
            updated_at: now,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true, returnDocument: 'after' }
      );

      if (!document) {
        throw new Error('Failed to upsert base data.');
      }

      return mapBaseDataRecord(document);
    },
  };
}

function mapBaseDataRecord(document: WithId<BaseData.Document>): BaseData.Record {
  return {
    baseMonth: { year: document.base_year, month: document.base_month },
    baselineTotal: document.baseline_total,
    currency: document.currency,
  };
}

function parseObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId value: ${value}`);
  }

  return new ObjectId(value);
}
