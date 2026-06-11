import { describe, it, expect } from 'vitest';

import {
  addApplicationSchema,
  bulkCreateInvestmentSchema,
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

describe('createInvestmentSchema — crypto', () => {
  const crypto = {
    name: 'Bitcoin',
    category: 'crypto' as const,
    type: 'Bitcoin',
    risk: 'high' as const,
  };

  it('accepts a crypto position with coin + quantity', () => {
    const result = createInvestmentSchema.safeParse({
      ...crypto,
      coinSymbol: 'BTC',
      quantity: 0.12345678,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a crypto position without a coin', () => {
    const result = createInvestmentSchema.safeParse({ ...crypto, quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects a crypto position without a quantity', () => {
    const result = createInvestmentSchema.safeParse({ ...crypto, coinSymbol: 'BTC' });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported coin', () => {
    const result = createInvestmentSchema.safeParse({
      ...crypto,
      coinSymbol: 'SHIB',
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a quantity with more than 8 decimals', () => {
    const result = createInvestmentSchema.safeParse({
      ...crypto,
      coinSymbol: 'BTC',
      quantity: 0.123456789,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive quantity', () => {
    const result = createInvestmentSchema.safeParse({
      ...crypto,
      coinSymbol: 'BTC',
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('createInvestmentSchema — dollar', () => {
  const dollar = {
    name: 'US Dollars',
    category: 'dollar' as const,
    type: 'Cash',
    risk: 'low' as const,
  };

  it('accepts a dollar position with an amount', () => {
    const result = createInvestmentSchema.safeParse({ ...dollar, quantity: 100.5 });
    expect(result.success).toBe(true);
  });

  it('rejects a dollar position without an amount', () => {
    expect(createInvestmentSchema.safeParse(dollar).success).toBe(false);
  });

  it('rejects a non-positive amount', () => {
    const result = createInvestmentSchema.safeParse({ ...dollar, quantity: 0 });
    expect(result.success).toBe(false);
  });
});

describe('bulkCreateInvestmentSchema', () => {
  const fixed = {
    name: 'Tesouro Selic',
    category: 'fixed_income' as const,
    type: 'Selic',
    risk: 'low' as const,
  };
  const crypto = {
    name: 'Bitcoin',
    category: 'crypto' as const,
    type: 'Bitcoin',
    risk: 'high' as const,
    coinSymbol: 'BTC',
    quantity: 0.5,
  };

  it('accepts a mix of valid positions', () => {
    const result = bulkCreateInvestmentSchema.safeParse([fixed, crypto]);
    expect(result.success).toBe(true);
  });

  it('rejects an empty array', () => {
    expect(bulkCreateInvestmentSchema.safeParse([]).success).toBe(false);
  });

  it('rejects the whole batch when one row is invalid', () => {
    const result = bulkCreateInvestmentSchema.safeParse([
      fixed,
      { ...crypto, coinSymbol: undefined },
    ]);
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

  it('accepts nulling crypto fields when switching category', () => {
    const result = updateInvestmentSchema.safeParse({
      coinSymbol: null,
      quantity: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts updating coin + quantity', () => {
    const result = updateInvestmentSchema.safeParse({
      coinSymbol: 'ETH',
      quantity: 2.5,
    });
    expect(result.success).toBe(true);
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
