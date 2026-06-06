import { z } from 'zod';

// Matches an ISO date `yyyy-MM-dd`, e.g. `2026-05-09`.
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Matches a bill month, e.g. `2026-06`.
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

// Matches a BR-formatted amount, optionally credit-signed: `"1.620,74"`,
// `"408,35"`, `"- 3.331,75"`, `"- 4,01"`.
const BR_AMOUNT_PATTERN = /^-?\s?\d{1,3}(\.\d{3})*,\d{2}$/;

/**
 * Validates a single parsed fatura row (raw string fields). Domain conversion
 * (to Date, centavos, flow, etc.) happens in `transform.ts` after validation.
 */
export const creditCardRowSchema = z.object({
  date: z
    .string()
    .regex(ISO_DATE_PATTERN, 'Date must be in yyyy-MM-dd format.')
    .refine(isRealCalendarDate, 'Date is not a valid calendar date.'),
  title: z.string().min(1, 'Title is required.'),
  amount: z.string().regex(BR_AMOUNT_PATTERN, 'Amount must be a BR-formatted decimal.'),
});

export type CreditCardRowFields = z.infer<typeof creditCardRowSchema>;

// Import payload (the multipart fields alongside the CSV file).
export const importBillSchema = z.object({
  cardLabel: z.string().trim().min(1, 'Card label is required.').max(80),
  billMonth: z
    .string()
    .regex(MONTH_PATTERN, 'Bill month must be in YYYY-MM format.')
    .refine(isRealMonth, 'Bill month is not valid.'),
});

export type ImportBillFields = z.infer<typeof importBillSchema>;

// Body for linking (or clearing) a bill's bank-statement payment.
export const linkPaymentSchema = z.object({
  paymentEntryId: z.string().nullable(),
});

/** Splits a `YYYY-MM` string into a `{ year, month }` filter. */
export function parseMonthParam(value: string): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid month value: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

function isRealMonth(value: string): boolean {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function isRealCalendarDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Reject overflow dates like 2026-02-31 by round-tripping through a UTC Date.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
