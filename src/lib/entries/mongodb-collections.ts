import 'server-only';

import type { Collection, Db } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import { DEFAULT_TAGGING_RULES } from '@/lib/entries/categorize';
import type { Entry } from '@/lib/entries/mongodb-documents';

export interface EntryCollections {
  entries: Collection<Entry.Document>;
  taggingRules: Collection<Entry.TaggingRule>;
  defaultTaggingRules: Collection<Entry.DefaultTaggingRule>;
}

declare global {
  var __entryIndexesPromise__: Promise<void> | undefined;
}

export async function getEntryCollections(): Promise<EntryCollections> {
  const db = await getMongoDb();
  const collections = createEntryCollections(db);

  if (!globalThis.__entryIndexesPromise__) {
    globalThis.__entryIndexesPromise__ = ensureEntryIndexes(collections).then(() =>
      ensureDefaultTaggingRules(collections)
    );
  }

  await globalThis.__entryIndexesPromise__;

  return collections;
}

function createEntryCollections(db: Db): EntryCollections {
  return {
    entries: db.collection<Entry.Document>('entries'),
    taggingRules: db.collection<Entry.TaggingRule>('entry_tagging_rules'),
    defaultTaggingRules: db.collection<Entry.DefaultTaggingRule>(
      'default_tagging_rules'
    ),
  };
}

async function ensureEntryIndexes(collections: EntryCollections): Promise<void> {
  await collections.entries.createIndexes([
    {
      key: { user_id: 1, occurred_at: -1 },
      name: 'entries_user_occurred_at',
    },
    {
      // Idempotency guard for imported statements: a given source id can only
      // exist once per user. Sparse so manually-created entries (no external_id)
      // are not constrained.
      key: { user_id: 1, external_id: 1 },
      name: 'entries_user_external_id',
      unique: true,
      sparse: true,
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

  // Tagging rules are listed and evaluated per user in priority order.
  await collections.taggingRules.createIndexes([
    {
      key: { user_id: 1, priority: 1 },
      name: 'tagging_rules_user_priority',
    },
  ]);
}

// Bootstraps the global `default_tagging_rules` collection from the code-defined
// seed list the first time it is empty. These defaults are the source copied to
// each user at sign-up; once populated they can be edited directly in the DB.
async function ensureDefaultTaggingRules(
  collections: EntryCollections
): Promise<void> {
  const existing = await collections.defaultTaggingRules.estimatedDocumentCount();
  if (existing > 0) return;

  const now = new Date();
  const documents: Entry.DefaultTaggingRule[] = DEFAULT_TAGGING_RULES.map(
    (rule) => ({
      pattern: rule.pattern,
      match_type: rule.matchType,
      category: rule.category,
      flow: rule.flow,
      priority: rule.priority ?? 0,
      created_at: now,
      updated_at: now,
    })
  );

  if (documents.length > 0) {
    await collections.defaultTaggingRules.insertMany(documents);
  }
}
