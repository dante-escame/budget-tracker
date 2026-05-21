import 'server-only';

import type { Collection, Db } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import type { Entry } from '@/lib/entries/mongodb-documents';

export interface EntryCollections {
  entries: Collection<Entry.Document>;
}

declare global {
  var __entryIndexesPromise__: Promise<void> | undefined;
}

export async function getEntryCollections(): Promise<EntryCollections> {
  const db = await getMongoDb();
  const collections = createEntryCollections(db);

  if (!globalThis.__entryIndexesPromise__) {
    globalThis.__entryIndexesPromise__ = ensureEntryIndexes(collections);
  }

  await globalThis.__entryIndexesPromise__;

  return collections;
}

function createEntryCollections(db: Db): EntryCollections {
  return {
    entries: db.collection<Entry.Document>('entries'),
  };
}

async function ensureEntryIndexes(collections: EntryCollections): Promise<void> {
  await collections.entries.createIndexes([
    {
      key: { user_id: 1, occurred_at: -1 },
      name: 'entries_user_occurred_at',
    },
    {
      key: { user_id: 1, flow: 1, occurred_at: -1 },
      name: 'entries_user_flow_occurred_at',
    },
    {
      key: { user_id: 1, category: 1, occurred_at: -1 },
      name: 'entries_user_category_occurred_at',
    },
    {
      key: { user_id: 1, status: 1, occurred_at: -1 },
      name: 'entries_user_status_occurred_at',
    },
    {
      key: { user_id: 1, competence_at: -1 },
      name: 'entries_user_competence_at',
    },
    {
      key: { 'installment.group_id': 1 },
      name: 'entries_installment_group_id',
      sparse: true,
    },
    {
      key: { 'recurrence.parent_id': 1 },
      name: 'entries_recurrence_parent_id',
      sparse: true,
    },
  ]);
}
