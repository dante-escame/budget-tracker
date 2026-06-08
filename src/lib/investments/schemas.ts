import { z } from 'zod';

export const INVESTMENT_CATEGORIES = [
  'fixed_income',
  'crypto',
  'stocks',
  'reits',
] as const;

export const INVESTMENT_RISKS = ['low', 'medium', 'high'] as const;

// ISO calendar date for an application, e.g. `2026-06-08`.
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const createInvestmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  category: z.enum(INVESTMENT_CATEGORIES),
  type: z.string().trim().min(1, 'Type is required.').max(80),
  risk: z.enum(INVESTMENT_RISKS),
  // Optional initial market value, in centavos.
  currentValue: z.number().int().min(0).optional(),
});

export const updateInvestmentSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.enum(INVESTMENT_CATEGORIES).optional(),
    type: z.string().trim().min(1).max(80).optional(),
    risk: z.enum(INVESTMENT_RISKS).optional(),
    currentValue: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export const addApplicationSchema = z.object({
  value: z.number().int().positive('Amount must be greater than zero.'),
  appliedAt: z
    .string()
    .regex(DATE_PATTERN, 'Date must be in YYYY-MM-DD format.')
    .refine(isRealCalendarDate, 'Date is not a valid calendar date.'),
});

export type CreateInvestmentFields = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentFields = z.infer<typeof updateInvestmentSchema>;
export type AddApplicationFields = z.infer<typeof addApplicationSchema>;

/** Parses a `YYYY-MM-DD` string into a UTC-midnight Date. */
export function parseApplicationDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isRealCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
