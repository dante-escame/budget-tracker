import 'server-only';

import { ObjectId, type AnyBulkWriteOperation, type WithId } from 'mongodb';

import { getEntryCollections } from '@/lib/entries/mongodb-collections';
import type { Entry } from '@/lib/entries/mongodb-documents';
import type {
  BulkUpsertResult,
  EntryRepository,
  MonthFilter,
} from '@/lib/entries/repository';
import type { EntryDraft } from '@/lib/entries/transform';

export async function createMongoEntryRepository(): Promise<EntryRepository> {
  const collections = await getEntryCollections();

  return {
    async bulkUpsertByExternalId(userId, drafts): Promise<BulkUpsertResult> {
      if (drafts.length === 0) {
        return { inserted: 0, skipped: 0 };
      }

      const userObjectId = parseObjectId(userId);
      const now = new Date();

      const operations: AnyBulkWriteOperation<Entry.Document>[] = drafts.map(
        (draft) => ({
          updateOne: {
            filter: { user_id: userObjectId, external_id: draft.externalId },
            // user_id and external_id come from the equality filter on insert;
            // including them here too would trigger a Mongo path conflict.
            update: { $setOnInsert: buildInsertFields(draft, now) },
            upsert: true,
          },
        })
      );

      const result = await collections.entries.bulkWrite(operations, {
        ordered: false,
      });

      const inserted = result.upsertedCount ?? 0;
      return { inserted, skipped: drafts.length - inserted };
    },

    async listEntriesByMonth(userId, month): Promise<Entry.Record[]> {
      const { start, end } = monthRange(month);

      const documents = await collections.entries
        .find({
          user_id: parseObjectId(userId),
          deleted_at: null,
          competence_at: { $gte: start, $lt: end },
        })
        .sort({ occurred_at: -1, _id: -1 })
        .toArray();

      return documents.map(mapEntryRecord);
    },

    async listAvailableMonths(userId): Promise<Entry.MonthOption[]> {
      const results = await collections.entries
        .aggregate<{ _id: { year: number; month: number } }>([
          { $match: { user_id: parseObjectId(userId), deleted_at: null } },
          {
            $group: {
              _id: {
                year: { $year: '$competence_at' },
                month: { $month: '$competence_at' },
              },
            },
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
        ])
        .toArray();

      return results.map((item) => ({
        year: item._id.year,
        month: item._id.month,
      }));
    },
  };
}

// Fields applied only when the entry is first inserted. Excludes user_id and
// external_id, which the upsert filter sets on the new document automatically.
function buildInsertFields(
  draft: EntryDraft,
  now: Date
): Omit<Entry.Document, '_id' | 'user_id' | 'external_id'> {
  return {
    description: draft.description,
    short_description: draft.shortDescription,
    value: draft.value,
    flow: draft.flow,
    type: draft.type,
    category: draft.category,
    tags: [],
    currency: draft.currency,
    occurred_at: draft.occurredAt,
    competence_at: draft.competenceAt,
    created_at: now,
    updated_at: now,
    status: draft.status,
    merchant: draft.merchant ?? undefined,
    deleted_at: null,
  };
}

function mapEntryRecord(document: WithId<Entry.Document>): Entry.Record {
  return {
    id: document._id.toHexString(),
    description: document.description,
    shortDescription: document.short_description,
    value: document.value,
    flow: document.flow,
    type: document.type,
    category: document.category,
    currency: document.currency,
    occurredAt: document.occurred_at.toISOString(),
    status: document.status,
    merchant: document.merchant ?? null,
  };
}

function monthRange(month: MonthFilter): { start: Date; end: Date } {
  const start = new Date(Date.UTC(month.year, month.month - 1, 1));
  const end = new Date(Date.UTC(month.year, month.month, 1));
  return { start, end };
}

function parseObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId value: ${value}`);
  }

  return new ObjectId(value);
}
