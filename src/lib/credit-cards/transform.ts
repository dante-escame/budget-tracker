import type { Entry } from '@/lib/entries/mongodb-documents';
import type { EntryDraft } from '@/lib/entries/transform';
import type { CreditCardRowFields } from '@/lib/credit-cards/schemas';

/**
 * A fatura row mapped to domain values, ready for the repository to persist as a
 * credit-card line item in the shared `entries` collection. Flat and ObjectId-free
 * so it stays pure and unit-testable; the repository attaches `user_id`, `bill_id`
 * and audit timestamps at insert time.
 */
export interface CardEntryDraft extends EntryDraft {
  source: 'credit_card_bill';
}

export interface BillContext {
  cardLabel: string;
  billMonth: { year: number; month: number };
}

const SHORT_DESCRIPTION_MAX = 80;

/** Maps validated fatura rows to drafts, assigning a stable per-row external id. */
export function creditCardRowsToDrafts(
  rows: CreditCardRowFields[],
  ctx: BillContext
): CardEntryDraft[] {
  // Identical rows (same date/title/amount) can legitimately repeat in one bill;
  // a per-group occurrence index keeps each external id unique yet stable across
  // re-imports of the same file.
  const seen = new Map<string, number>();

  return rows.map((row) => {
    const centavos = brAmountToCentavos(row.amount);
    const key = `${row.date}|${row.title}|${centavos}`;
    const dupIndex = seen.get(key) ?? 0;
    seen.set(key, dupIndex + 1);
    return creditCardRowToDraft(row, ctx, dupIndex);
  });
}

/** Maps a single validated fatura row to a draft. Pure — no I/O. */
export function creditCardRowToDraft(
  fields: CreditCardRowFields,
  ctx: BillContext,
  dupIndex: number
): CardEntryDraft {
  const occurredAt = parseIsoDate(fields.date);
  const centavos = brAmountToCentavos(fields.amount);
  // In a fatura a positive amount is a charge (you owe → outcome); a negative
  // amount is a credit such as a refund or the payment received (→ income).
  const flow: Entry.Flow = centavos < 0 ? 'income' : 'outcome';
  const description = fields.title;

  return {
    externalId: buildExternalId(ctx.cardLabel, fields, centavos, dupIndex),
    description,
    shortDescription: toShortDescription(description),
    value: Math.abs(centavos),
    flow,
    type: 'credit_card',
    category: flow === 'income' ? 'other_income' : 'other_outcome',
    currency: 'BRL',
    occurredAt,
    competenceAt: monthStart(ctx.billMonth),
    status: 'confirmed',
    merchant: extractCardMerchant(description),
    source: 'credit_card_bill',
  };
}

/** Deterministic idempotency key for a fatura line (no source id is provided). */
export function buildExternalId(
  cardLabel: string,
  fields: CreditCardRowFields,
  centavos: number,
  dupIndex: number
): string {
  return `cc:${cardLabel}:${fields.date}:${fields.title}:${centavos}:${dupIndex}`;
}

/** Parses `yyyy-MM-dd` into a UTC-midnight Date. Assumes prior schema validation. */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** First day of a `{ year, month }` at UTC midnight. */
export function monthStart({ year, month }: { year: number; month: number }): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Converts a BR-formatted amount (e.g. `"1.620,74"`, `"- 3.331,75"`) to signed
 * integer centavos. Thousands separators (`.`) are dropped and the decimal comma
 * becomes the cents.
 */
export function brAmountToCentavos(value: string): number {
  const cleaned = value.replace(/\s/g, '');
  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;

  const normalized = unsigned.replace(/\./g, '');
  const [whole, fraction = ''] = normalized.split(',');
  const cents = Number(`${fraction}00`.slice(0, 2));
  const magnitude = Number(whole) * 100 + cents;

  return negative ? -magnitude : magnitude;
}

/** True for the "Pagamento recebido" credit line, which is excluded from totals. */
export function isPaymentReceivedLine(title: string): boolean {
  return /pagamento recebido/i.test(title);
}

/**
 * Bill total in centavos: signed sum of the line items (charges add, credits
 * subtract) EXCLUDING the "Pagamento recebido" line, which represents settling a
 * previous bill rather than a charge on this one.
 */
export function computeBillTotal(
  items: { description: string; flow: Entry.Flow; value: number }[]
): number {
  let total = 0;
  for (const item of items) {
    if (isPaymentReceivedLine(item.description)) continue;
    total += item.flow === 'outcome' ? item.value : -item.value;
  }
  return total;
}

/** Installment info parsed from a `... - Parcela 1/6` title, when present. */
export function parseInstallment(title: string): { number: number; total: number } | null {
  const match = /parcela\s+(\d+)\/(\d+)/i.exec(title);
  if (!match) return null;
  return { number: Number(match[1]), total: Number(match[2]) };
}

/**
 * Merchant from a fatura title: the first ` - ` segment, with any trailing
 * `Parcela x/y` dropped. E.g. `"Amazon - Parcela 1/6"` → `"Amazon"`,
 * `"Netflix.Com"` → `"Netflix.Com"`.
 */
export function extractCardMerchant(title: string): string | null {
  const first = title.split(' - ')[0]?.trim();
  if (!first) return null;
  const withoutInstallment = first.replace(/\s*-?\s*parcela\s+\d+\/\d+\s*$/i, '').trim();
  return withoutInstallment || null;
}

function toShortDescription(description: string): string {
  if (description.length <= SHORT_DESCRIPTION_MAX) return description;
  return `${description.slice(0, SHORT_DESCRIPTION_MAX - 1).trimEnd()}…`;
}
