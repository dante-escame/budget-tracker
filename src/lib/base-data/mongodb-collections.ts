import 'server-only';

import type { Collection, Db } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import type { BaseData } from '@/lib/base-data/mongodb-documents';

export interface BaseDataCollections {
  baseData: Collection<BaseData.Document>;
}

declare global {
  var __baseDataIndexesPromise__: Promise<void> | undefined;
}

export async function getBaseDataCollections(): Promise<BaseDataCollections> {
  const db = await getMongoDb();
  const collections = createBaseDataCollections(db);

  if (!globalThis.__baseDataIndexesPromise__) {
    globalThis.__baseDataIndexesPromise__ = ensureBaseDataIndexes(collections);
  }

  await globalThis.__baseDataIndexesPromise__;

  return collections;
}

function createBaseDataCollections(db: Db): BaseDataCollections {
  return {
    baseData: db.collection<BaseData.Document>('base_data'),
  };
}

async function ensureBaseDataIndexes(
  collections: BaseDataCollections
): Promise<void> {
  await collections.baseData.createIndexes([
    {
      // One base-data config per user.
      key: { user_id: 1 },
      name: 'base_data_user',
      unique: true,
    },
  ]);
}
