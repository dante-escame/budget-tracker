import { describe, it, expect } from 'vitest';

import { baseDataInputSchema } from '@/lib/base-data/schemas';

const validInput = { baseMonth: '2026-01', baseline: '1500.00' };

describe('baseDataInputSchema', () => {
  it('accepts a valid base month and opening balance', () => {
    expect(baseDataInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('accepts a negative opening balance', () => {
    expect(
      baseDataInputSchema.safeParse({ ...validInput, baseline: '-250.5' }).success
    ).toBe(true);
  });

  it('accepts a zero opening balance', () => {
    expect(baseDataInputSchema.safeParse({ ...validInput, baseline: '0' }).success).toBe(
      true
    );
  });

  it('rejects a malformed month', () => {
    const result = baseDataInputSchema.safeParse({ ...validInput, baseMonth: '2026/01' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Month must be in YYYY-MM format.');
  });

  it('rejects an out-of-range month', () => {
    const result = baseDataInputSchema.safeParse({ ...validInput, baseMonth: '2026-13' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Month is not valid.');
  });

  it('rejects a non-numeric opening balance', () => {
    const result = baseDataInputSchema.safeParse({ ...validInput, baseline: 'R$ 10' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Opening balance must be a decimal number.'
    );
  });
});
