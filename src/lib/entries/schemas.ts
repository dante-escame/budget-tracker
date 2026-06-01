import { z } from 'zod';

import { ALL_CATEGORIES } from '@/lib/entries/categories';
import type { Entry } from '@/lib/entries/mongodb-documents';

// Matches `dd/MM/yyyy`, e.g. `01/05/2026`.
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

// Matches a competence month, e.g. `2026-05`.
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

// Matches an optionally-signed decimal amount in reais, e.g. `-115.90`, `12683.04`.
const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Validates a single parsed statement row (raw string fields). Domain conversion
 * (to Date, centavos, flow, etc.) happens in `transform.ts` after validation.
 */
export const statementRowSchema = z.object({
  data: z
    .string()
    .regex(DATE_PATTERN, 'Date must be in dd/MM/yyyy format.')
    .refine(isRealCalendarDate, 'Date is not a valid calendar date.'),
  valor: z.string().regex(AMOUNT_PATTERN, 'Amount must be a decimal number.'),
  identificador: z.string().uuid('Identifier must be a valid UUID.'),
  descricao: z.string().min(1, 'Description is required.'),
});

export type StatementRowFields = z.infer<typeof statementRowSchema>;

// Any valid category value. Built from the shared category list so it stays in
// sync with the `Entry.Category` union.
export const categorySchema = z.enum(
  ALL_CATEGORIES as [Entry.Category, ...Entry.Category[]]
);

// Create/update payload for a tagging rule.
export const taggingRuleInputSchema = z.object({
  pattern: z.string().trim().min(1, 'Pattern is required.').max(200),
  category: categorySchema,
  matchType: z.enum(['contains']).default('contains'),
  flow: z.enum(['income', 'outcome']).nullable().default(null),
  priority: z.number().int().min(0).optional(),
});

export type TaggingRuleInputFields = z.infer<typeof taggingRuleInputSchema>;

// Body for the "Apply All Rules" action: the competence month to target.
export const applyRulesSchema = z.object({
  month: z
    .string()
    .regex(MONTH_PATTERN, 'Month must be in YYYY-MM format.')
    .refine(isRealMonth, 'Month is not valid.'),
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
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Reject overflow dates like 31/02 by round-tripping through a UTC Date.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
