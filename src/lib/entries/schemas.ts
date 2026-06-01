import { z } from 'zod';

// Matches `dd/MM/yyyy`, e.g. `01/05/2026`.
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

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
