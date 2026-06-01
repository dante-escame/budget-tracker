import type { Entry } from '@/lib/entries/mongodb-documents';
import type { StatementRowFields } from '@/lib/entries/schemas';

/**
 * A statement row mapped to domain values, ready for the repository to persist.
 * Intentionally flat and ObjectId-free so it stays pure and unit-testable; the
 * repository attaches `user_id` and the audit timestamps at insert time.
 */
export interface EntryDraft {
  externalId: string;
  description: string;
  shortDescription: string;
  value: number; // absolute centavos
  flow: Entry.Flow;
  type: Entry.PaymentType;
  category: Entry.Category;
  currency: string;
  occurredAt: Date;
  competenceAt: Date;
  status: Entry.Status;
  merchant: string | null;
}

const SHORT_DESCRIPTION_MAX = 80;

/** Maps a validated statement row to an `EntryDraft`. Pure — no I/O. */
export function statementRowToDraft(fields: StatementRowFields): EntryDraft {
  const occurredAt = parseStatementDate(fields.data);
  const centavos = reaisToCentavos(fields.valor);
  const flow: Entry.Flow = centavos < 0 ? 'outcome' : 'income';
  const description = fields.descricao;

  return {
    externalId: fields.identificador,
    description,
    shortDescription: toShortDescription(description),
    value: Math.abs(centavos),
    flow,
    type: inferPaymentType(description),
    category: flow === 'income' ? 'other_income' : 'other_outcome',
    currency: 'BRL',
    occurredAt,
    competenceAt: toMonthStart(occurredAt),
    status: 'confirmed',
    merchant: extractMerchant(description),
  };
}

/** Parses `dd/MM/yyyy` into a UTC-midnight Date. Assumes prior schema validation. */
export function parseStatementDate(value: string): Date {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Converts a reais decimal string (e.g. `-115.90`) to signed integer centavos. */
export function reaisToCentavos(value: string): number {
  // Work in integer space to avoid float drift: split on the decimal point.
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const cents = `${fraction}00`.slice(0, 2);
  const magnitude = Number(whole) * 100 + Number(cents);
  return negative ? -magnitude : magnitude;
}

/** First day of the entry's month, at UTC midnight — the budget competence month. */
export function toMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Best-effort payment-type inference from the Portuguese description text. */
export function inferPaymentType(description: string): Entry.PaymentType {
  const text = description.toLowerCase();

  if (text.includes('pix')) return 'pix';
  if (text.includes('boleto')) return 'boleto';
  if (text.includes('pagamento de fatura')) return 'credit_card';
  if (text.includes('débito') || text.includes('debito')) return 'debit_card';
  if (text.includes('ted')) return 'ted';
  if (text.includes('doc')) return 'doc';
  return 'other';
}

function toShortDescription(description: string): string {
  if (description.length <= SHORT_DESCRIPTION_MAX) return description;
  return `${description.slice(0, SHORT_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/** Pulls the trailing segment after the last ` - ` as a rough merchant/counterparty. */
function extractMerchant(description: string): string | null {
  const segments = description.split(' - ');
  if (segments.length < 2) return null;
  const last = segments[segments.length - 1]?.trim();
  return last ? last : null;
}
