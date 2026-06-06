import { z } from 'zod';

import { isRealMonth } from '@/lib/entries/schemas';

// Matches a competence month, e.g. `2026-05`.
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

// Optionally-signed decimal amount in reais, e.g. `-115.90`, `12683.04`, `0`.
const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/;

// Body for setting base data: the base month and the opening balance (reais).
export const baseDataInputSchema = z.object({
  baseMonth: z
    .string()
    .regex(MONTH_PATTERN, 'Month must be in YYYY-MM format.')
    .refine(isRealMonth, 'Month is not valid.'),
  baseline: z
    .string()
    .regex(AMOUNT_PATTERN, 'Opening balance must be a decimal number.'),
});

export type BaseDataInputFields = z.infer<typeof baseDataInputSchema>;
