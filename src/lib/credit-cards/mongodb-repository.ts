import 'server-only';

import { ObjectId, type AnyBulkWriteOperation, type WithId } from 'mongodb';

import { getEntryCollections } from '@/lib/entries/mongodb-collections';
import type { MatchableRule } from '@/lib/entries/categorize';
import type { Entry } from '@/lib/entries/mongodb-documents';
import type { BulkUpsertResult } from '@/lib/entries/repository';
import { getCreditCardCollections } from '@/lib/credit-cards/mongodb-collections';
import type { CreditCard } from '@/lib/credit-cards/mongodb-documents';
import type {
  CreditCardRepository,
  MonthFilter,
} from '@/lib/credit-cards/repository';
import type { CardEntryDraft } from '@/lib/credit-cards/transform';
import { computeBillTotal } from '@/lib/credit-cards/transform';
import { rankPaymentCandidates } from '@/lib/credit-cards/matching';

// How far after a bill's month to look for the bank-statement payment that
// settled it (faturas are typically paid the following month).
const PAYMENT_WINDOW_DAYS = 60;
const MAX_PAYMENT_CANDIDATES = 8;

export async function createMongoCreditCardRepository(): Promise<CreditCardRepository> {
  const [creditCards, entries] = await Promise.all([
    getCreditCardCollections(),
    getEntryCollections(),
  ]);

  return {
    async upsertBill(userId, cardLabel, billMonth) {
      const userObjectId = parseObjectId(userId);
      const competenceAt = monthStart(billMonth);
      const now = new Date();

      const bill = await creditCards.bills.findOneAndUpdate(
        { user_id: userObjectId, card_label: cardLabel, competence_at: competenceAt },
        {
          $setOnInsert: {
            currency: 'BRL',
            total: 0,
            paid_at: null,
            linked_payment_entry_id: null,
            created_at: now,
          },
          $set: { updated_at: now },
        },
        { upsert: true, returnDocument: 'after' }
      );

      if (!bill) {
        throw new Error('Failed to upsert credit-card bill.');
      }

      return { billId: bill._id.toHexString(), currency: bill.currency };
    },

    async bulkUpsertCardEntries(userId, billId, drafts): Promise<BulkUpsertResult> {
      if (drafts.length === 0) {
        return { inserted: 0, skipped: 0 };
      }

      const userObjectId = parseObjectId(userId);
      const billObjectId = parseObjectId(billId);
      const now = new Date();

      const operations: AnyBulkWriteOperation<Entry.Document>[] = drafts.map(
        (draft) => ({
          updateOne: {
            filter: { user_id: userObjectId, external_id: draft.externalId },
            update: { $setOnInsert: buildCardInsertFields(draft, billObjectId, now) },
            upsert: true,
          },
        })
      );

      const result = await entries.entries.bulkWrite(operations, { ordered: false });
      const inserted = result.upsertedCount ?? 0;
      return { inserted, skipped: drafts.length - inserted };
    },

    async recomputeBillTotal(userId, billId): Promise<number> {
      const userObjectId = parseObjectId(userId);
      const billObjectId = parseObjectId(billId);

      const documents = await entries.entries
        .find({ user_id: userObjectId, bill_id: billObjectId, deleted_at: null })
        .toArray();

      const total = computeBillTotal(
        documents.map((doc) => ({
          description: doc.description,
          flow: doc.flow,
          value: doc.value,
        }))
      );

      await creditCards.bills.updateOne(
        { _id: billObjectId, user_id: userObjectId },
        { $set: { total, updated_at: new Date() } }
      );

      return total;
    },

    async listBills(userId): Promise<CreditCard.BillSummary[]> {
      const documents = await creditCards.bills
        .find({ user_id: parseObjectId(userId) })
        .sort({ competence_at: -1, card_label: 1 })
        .toArray();

      return documents.map((doc) => ({
        id: doc._id.toHexString(),
        cardLabel: doc.card_label,
        competence: toMonthOption(doc.competence_at),
        total: doc.total,
        paid: doc.paid_at !== null,
      }));
    },

    async getBill(userId, cardLabel, billMonth) {
      const userObjectId = parseObjectId(userId);
      const competenceAt = monthStart(billMonth);

      const bill = await creditCards.bills.findOne({
        user_id: userObjectId,
        card_label: cardLabel,
        competence_at: competenceAt,
      });

      if (!bill) return null;

      const documents = await entries.entries
        .find({ user_id: userObjectId, bill_id: bill._id, deleted_at: null })
        .sort({ occurred_at: -1, _id: -1 })
        .toArray();

      const linkedPayment = await loadLinkedPayment(entries, userObjectId, bill);

      return {
        bill: mapBillRecord(bill, linkedPayment),
        entries: documents.map(mapEntryRecord),
      };
    },

    async listPaymentCandidates(userId, billId): Promise<CreditCard.PaymentCandidate[]> {
      const userObjectId = parseObjectId(userId);
      const billObjectId = parseObjectId(billId);

      const bill = await creditCards.bills.findOne({
        _id: billObjectId,
        user_id: userObjectId,
      });
      if (!bill) return [];

      const windowEnd = addDays(bill.competence_at, PAYMENT_WINDOW_DAYS);

      const documents = await entries.entries
        .find({
          user_id: userObjectId,
          deleted_at: null,
          flow: 'outcome',
          // Exclude card line items (their source is 'credit_card_bill').
          source: { $ne: 'credit_card_bill' },
          occurred_at: { $gte: bill.competence_at, $lte: windowEnd },
          $or: [
            { type: 'credit_card' },
            { description: { $regex: 'pagamento de fatura', $options: 'i' } },
          ],
        })
        .toArray();

      const candidates: CreditCard.PaymentCandidate[] = documents.map((doc) => ({
        entryId: doc._id.toHexString(),
        description: doc.description,
        occurredAt: doc.occurred_at.toISOString(),
        value: doc.value,
      }));

      return rankPaymentCandidates(candidates, bill.total).slice(
        0,
        MAX_PAYMENT_CANDIDATES
      );
    },

    async linkPayment(userId, billId, paymentEntryId): Promise<CreditCard.BillRecord | null> {
      const userObjectId = parseObjectId(userId);
      const billObjectId = parseObjectId(billId);
      const now = new Date();

      if (paymentEntryId === null) {
        const bill = await creditCards.bills.findOneAndUpdate(
          { _id: billObjectId, user_id: userObjectId },
          { $set: { linked_payment_entry_id: null, paid_at: null, updated_at: now } },
          { returnDocument: 'after' }
        );
        return bill ? mapBillRecord(bill, null) : null;
      }

      if (!ObjectId.isValid(paymentEntryId)) return null;
      const paymentObjectId = new ObjectId(paymentEntryId);

      const payment = await entries.entries.findOne({
        _id: paymentObjectId,
        user_id: userObjectId,
        deleted_at: null,
      });
      if (!payment) return null;

      const bill = await creditCards.bills.findOneAndUpdate(
        { _id: billObjectId, user_id: userObjectId },
        {
          $set: {
            linked_payment_entry_id: paymentObjectId,
            paid_at: payment.occurred_at,
            updated_at: now,
          },
        },
        { returnDocument: 'after' }
      );

      if (!bill) return null;
      return mapBillRecord(bill, {
        entryId: payment._id.toHexString(),
        description: payment.description,
        occurredAt: payment.occurred_at.toISOString(),
        value: payment.value,
      });
    },

    async listTaggingRules(userId): Promise<MatchableRule[]> {
      const documents = await entries.taggingRules
        .find({ user_id: parseObjectId(userId) })
        .sort({ priority: 1, _id: 1 })
        .toArray();

      return documents.map((doc) => ({
        pattern: doc.pattern,
        matchType: doc.match_type,
        category: doc.category,
        flow: doc.flow,
        priority: doc.priority,
      }));
    },
  };
}

async function loadLinkedPayment(
  entries: Awaited<ReturnType<typeof getEntryCollections>>,
  userObjectId: ObjectId,
  bill: WithId<CreditCard.Bill>
): Promise<CreditCard.LinkedPayment | null> {
  if (!bill.linked_payment_entry_id) return null;

  const payment = await entries.entries.findOne({
    _id: bill.linked_payment_entry_id,
    user_id: userObjectId,
  });
  if (!payment) return null;

  return {
    entryId: payment._id.toHexString(),
    description: payment.description,
    occurredAt: payment.occurred_at.toISOString(),
    value: payment.value,
  };
}

// Fields applied only when a card line item is first inserted. Excludes user_id
// and external_id, which the upsert filter sets on the new document automatically.
function buildCardInsertFields(
  draft: CardEntryDraft,
  billObjectId: ObjectId,
  now: Date
): Omit<Entry.Document, '_id' | 'user_id' | 'external_id'> {
  return {
    source: draft.source,
    bill_id: billObjectId,
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

function mapBillRecord(
  bill: WithId<CreditCard.Bill>,
  linkedPayment: CreditCard.LinkedPayment | null
): CreditCard.BillRecord {
  return {
    id: bill._id.toHexString(),
    cardLabel: bill.card_label,
    competence: toMonthOption(bill.competence_at),
    currency: bill.currency,
    total: bill.total,
    paidAt: bill.paid_at ? bill.paid_at.toISOString() : null,
    linkedPayment,
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
    source: document.source ?? 'bank_statement',
  };
}

function toMonthOption(date: Date): CreditCard.MonthOption {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthStart({ year, month }: MonthFilter): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId value: ${value}`);
  }
  return new ObjectId(value);
}
