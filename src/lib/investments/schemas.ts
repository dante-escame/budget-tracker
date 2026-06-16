import { z } from 'zod';

import { B3_TICKER_PATTERN } from '@/lib/investments/b3-stocks';
import {
  CRYPTO_COIN_SYMBOLS,
  CRYPTO_QUANTITY_DECIMALS,
} from '@/lib/investments/crypto-coins';
import { DOLLAR_QUANTITY_DECIMALS } from '@/lib/investments/dollar';

export const INVESTMENT_CATEGORIES = [
  'fixed_income',
  'crypto',
  'dollar',
  'stocks',
  'reits',
] as const;

export const INVESTMENT_RISKS = ['low', 'medium', 'high'] as const;

// ISO calendar date for an application, e.g. `2026-06-08`.
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const coinSymbolSchema = z.enum(
  CRYPTO_COIN_SYMBOLS as [string, ...string[]]
);

// Any well-formed B3 ticker is accepted (not just the curated list) so positions
// can track the full B3 universe via the live provider search. The price fetcher
// degrades gracefully for tickers the provider doesn't recognise.
const tickerSymbolSchema = z
  .string()
  .trim()
  .regex(B3_TICKER_PATTERN, 'Enter a valid B3 ticker (e.g. PETR4).');

const quantitySchema = z
  .number()
  .positive('Quantity must be greater than zero.')
  .refine(
    (value) => decimalPlaces(value) <= CRYPTO_QUANTITY_DECIMALS,
    `Quantity supports at most ${CRYPTO_QUANTITY_DECIMALS} decimal places.`
  );

// Dollar positions represent USD amounts and are valued at cent precision, so
// they cap at 2 decimals (the generic `quantitySchema` allows crypto's 8).
const dollarQuantitySchema = z
  .number()
  .positive('Amount must be greater than zero.')
  .refine(
    (value) => decimalPlaces(value) <= DOLLAR_QUANTITY_DECIMALS,
    `Dollar amounts support at most ${DOLLAR_QUANTITY_DECIMALS} decimal places (cents).`
  );

// Crypto positions are valued from a live quote, so they require a coin +
// quantity and ignore `currentValue`. Every other category keeps the optional
// manual market value.
const cryptoFieldsRefinement = (
  value: { category: string; coinSymbol?: unknown; quantity?: unknown },
  ctx: z.RefinementCtx
) => {
  if (value.category !== 'crypto') return;
  if (value.coinSymbol === undefined || value.coinSymbol === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['coinSymbol'],
      message: 'Select a coin for crypto positions.',
    });
  }
  if (value.quantity === undefined || value.quantity === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'Quantity is required for crypto positions.',
    });
  }
};

// Dollar positions are valued from a live USD→BRL quote: they require a held
// `quantity` (amount of dollars) and ignore both `coinSymbol` and `currentValue`.
const dollarFieldsRefinement = (
  value: { category: string; quantity?: unknown },
  ctx: z.RefinementCtx
) => {
  if (value.category !== 'dollar') return;
  if (value.quantity === undefined || value.quantity === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'Amount is required for dollar positions.',
    });
    return;
  }
  const result = dollarQuantitySchema.safeParse(value.quantity);
  if (!result.success) {
    result.error.issues.forEach((issue) =>
      ctx.addIssue({ ...issue, path: ['quantity'] })
    );
  }
};

// Stock and FII positions are valued from a live B3 quote: they require a
// `tickerSymbol` (the B3 ticker) and a whole-share `quantity`, and ignore both
// `coinSymbol` and `currentValue`.
const b3FieldsRefinement = (
  value: { category: string; tickerSymbol?: unknown; quantity?: unknown },
  ctx: z.RefinementCtx
) => {
  if (value.category !== 'stocks' && value.category !== 'reits') return;
  if (value.tickerSymbol === undefined || value.tickerSymbol === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tickerSymbol'],
      message: 'Select a ticker for stock and FII positions.',
    });
  }
  if (value.quantity === undefined || value.quantity === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'Quantity is required for stock and FII positions.',
    });
  } else if (typeof value.quantity === 'number' && !Number.isInteger(value.quantity)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'Quantity must be a whole number of shares.',
    });
  }
};

export const createInvestmentSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(120),
    category: z.enum(INVESTMENT_CATEGORIES),
    type: z.string().trim().min(1, 'Type is required.').max(80),
    risk: z.enum(INVESTMENT_RISKS),
    // Optional initial market value, in centavos (manual categories only).
    currentValue: z.number().int().min(0).optional(),
    coinSymbol: coinSymbolSchema.optional(),
    tickerSymbol: tickerSymbolSchema.optional(),
    quantity: quantitySchema.optional(),
  })
  .superRefine((value, ctx) => {
    cryptoFieldsRefinement(value, ctx);
    dollarFieldsRefinement(value, ctx);
    b3FieldsRefinement(value, ctx);
  });

// Saving several positions in one atomic request (the bulk add form).
export const bulkCreateInvestmentSchema = z
  .array(createInvestmentSchema)
  .min(1, 'At least one investment is required.')
  .max(100, 'Too many investments in a single request.');

export const updateInvestmentSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.enum(INVESTMENT_CATEGORIES).optional(),
    type: z.string().trim().min(1).max(80).optional(),
    risk: z.enum(INVESTMENT_RISKS).optional(),
    currentValue: z.number().int().min(0).optional(),
    // Nullable so switching a position away from crypto/stocks can clear them.
    coinSymbol: coinSymbolSchema.nullable().optional(),
    tickerSymbol: tickerSymbolSchema.nullable().optional(),
    quantity: quantitySchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

function decimalPlaces(value: number): number {
  if (Number.isInteger(value)) return 0;
  const text = value.toString();
  if (text.includes('e') || text.includes('E')) {
    // Scientific notation (very small numbers) — be lenient.
    return CRYPTO_QUANTITY_DECIMALS;
  }
  return text.split('.')[1]?.length ?? 0;
}

export const addApplicationSchema = z.object({
  value: z.number().int().positive('Amount must be greater than zero.'),
  flow: z.enum(['income', 'outcome']).default('outcome'),
  appliedAt: z
    .string()
    .regex(DATE_PATTERN, 'Date must be in YYYY-MM-DD format.')
    .refine(isRealCalendarDate, 'Date is not a valid calendar date.'),
});

export type CreateInvestmentFields = z.infer<typeof createInvestmentSchema>;
export type BulkCreateInvestmentFields = z.infer<typeof bulkCreateInvestmentSchema>;
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
