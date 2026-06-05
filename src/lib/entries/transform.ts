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
  // Pad fraction to 3 digits so we can round on the sub-cent digit (e.g. "9" → 90¢, "999" → 100¢).
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const padded = `${fraction}00`.slice(0, 3);
  const cents = Math.round(Number(padded) / 10);
  const magnitude = Number(whole) * 100 + cents;
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
  if (/\bted\b/.test(text)) return 'ted';
  if (/\bdoc\b/.test(text)) return 'doc';
  return 'other';
}

function toShortDescription(description: string): string {
  if (description.length <= SHORT_DESCRIPTION_MAX) return description;
  return `${description.slice(0, SHORT_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/**
 * Extracts the merchant/counterparty from a description.
 * Uses the 2nd segment (index 1) rather than the last: for Pix rows the format is
 * "Action - PAYEE - CPF/CNPJ - BANK INFO", so the last segment is account noise.
 * For 2-segment purchase rows ("Action - MERCHANT") index 1 is the last anyway.
 */
function extractMerchant(description: string): string | null {
  const segments = description.split(' - ');
  if (segments.length < 2) return null;
  const payee = segments[1]?.trim();
  return payee ? payee : null;
}
