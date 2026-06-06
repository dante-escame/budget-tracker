import { describe, it, expect } from 'vitest';

import {
  creditCardRowSchema,
  importBillSchema,
  parseMonthParam,
} from '@/lib/credit-cards/schemas';

const validRow = { date: '2026-05-09', title: 'Netflix.Com', amount: '59,90' };

describe('creditCardRowSchema', () => {
  it('accepts a well-formed row', () => {
    expect(creditCardRowSchema.safeParse(validRow).success).toBe(true);
    expect(creditCardRowSchema.safeParse({ ...validRow, amount: '- 3.331,75' }).success).toBe(
      true
    );
  });

  it('rejects a non-ISO date', () => {
    const result = creditCardRowSchema.safeParse({ ...validRow, date: '09/05/2026' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Date must be in yyyy-MM-dd format.');
  });

  it('rejects an impossible calendar date', () => {
    const result = creditCardRowSchema.safeParse({ ...validRow, date: '2026-02-31' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-BR amount', () => {
    const result = creditCardRowSchema.safeParse({ ...validRow, amount: '59.90' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Amount must be a BR-formatted decimal.');
  });

  it('requires a title', () => {
    expect(creditCardRowSchema.safeParse({ ...validRow, title: '' }).success).toBe(false);
  });
});

describe('importBillSchema', () => {
  it('accepts a card label and a valid month', () => {
    expect(importBillSchema.safeParse({ cardLabel: 'Nubank', billMonth: '2026-06' }).success).toBe(
      true
    );
  });

  it('rejects an empty card label', () => {
    expect(importBillSchema.safeParse({ cardLabel: '  ', billMonth: '2026-06' }).success).toBe(
      false
    );
  });

  it('rejects an invalid month', () => {
    expect(importBillSchema.safeParse({ cardLabel: 'Nubank', billMonth: '2026-13' }).success).toBe(
      false
    );
  });
});

describe('parseMonthParam', () => {
  it('splits YYYY-MM into year and month', () => {
    expect(parseMonthParam('2026-06')).toEqual({ year: 2026, month: 6 });
  });
});
