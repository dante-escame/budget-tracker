import { describe, it, expect } from 'vitest';

import {
  addApplicationSchema,
  createInvestmentSchema,
  parseApplicationDate,
  updateInvestmentSchema,
} from '@/lib/investments/schemas';

describe('createInvestmentSchema', () => {
  const valid = {
    name: 'Tesouro Selic',
    category: 'fixed_income' as const,
    type: 'Selic',
    risk: 'low' as const,
  };

  it('accepts a well-formed position', () => {
    expect(createInvestmentSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an optional current value in centavos', () => {
    const result = createInvestmentSchema.safeParse({ ...valid, currentValue: 12_345 });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown category', () => {
    const result = createInvestmentSchema.safeParse({ ...valid, category: 'gold' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty type', () => {
    const result = createInvestmentSchema.safeParse({ ...valid, type: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative current value', () => {
    const result = createInvestmentSchema.safeParse({ ...valid, currentValue: -1 });
    expect(result.success).toBe(false);
  });
});

describe('updateInvestmentSchema', () => {
  it('requires at least one field', () => {
    expect(updateInvestmentSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a single field', () => {
    expect(updateInvestmentSchema.safeParse({ currentValue: 999 }).success).toBe(true);
  });
});

describe('addApplicationSchema', () => {
  it('accepts a positive amount and ISO date', () => {
    const result = addApplicationSchema.safeParse({
      value: 5_000,
      appliedAt: '2026-06-08',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-positive amount', () => {
    const result = addApplicationSchema.safeParse({ value: 0, appliedAt: '2026-06-08' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed date', () => {
    const result = addApplicationSchema.safeParse({
      value: 5_000,
      appliedAt: '08/06/2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an impossible calendar date', () => {
    const result = addApplicationSchema.safeParse({
      value: 5_000,
      appliedAt: '2026-02-31',
    });
    expect(result.success).toBe(false);
  });

  it('defaults flow to outcome when omitted', () => {
    const result = addApplicationSchema.safeParse({ value: 5_000, appliedAt: '2026-06-08' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.flow).toBe('outcome');
  });
});

describe('parseApplicationDate', () => {
  it('parses a YYYY-MM-DD string to a UTC-midnight date', () => {
    expect(parseApplicationDate('2026-06-08').toISOString()).toBe(
      '2026-06-08T00:00:00.000Z'
    );
  });
});
