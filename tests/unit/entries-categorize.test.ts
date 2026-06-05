import { describe, it, expect } from 'vitest';

import {
  DEFAULT_TAGGING_RULES,
  matchCategory,
  normalizeText,
  type MatchableRule,
} from '@/lib/entries/categorize';

// The seed rules are valid matchable rules (every one has a priority).
const DEFAULTS = DEFAULT_TAGGING_RULES as MatchableRule[];

describe('normalizeText', () => {
  it('lowercases, strips accents and collapses whitespace', () => {
    expect(normalizeText('  Compra no DÉBITO ')).toBe('compra no debito');
    expect(normalizeText('SAÚDE')).toBe('saude');
  });
});

describe('matchCategory with default rules', () => {
  const cases: [string, string][] = [
    ['Compra no débito via NuPay - iFood', 'dining'],
    ['Compra no débito - COVABRA SUPERMERCADOS', 'food'],
    ['Compra no débito - Centerplexcinemas', 'entertainment'],
    ['Compra no débito via NuPay - EBW*Spotify', 'subscriptions'],
    ['Compra no débito - Wellhub Dante Escame', 'subscriptions'],
    ['Compra no débito - ShoppingLimeira', 'shopping'],
    ['Pagamento de fatura', 'financial'],
  ];

  it.each(cases)('categorizes %s as %s', (description, expected) => {
    expect(matchCategory(description, null, 'outcome', DEFAULTS)).toBe(expected);
  });

  it('matches taxes on an income-agnostic outcome description', () => {
    const description =
      'Transferência enviada pelo Pix - RECEITA FEDERAL - 00.394.460/0058-87';
    expect(matchCategory(description, null, 'outcome', DEFAULTS)).toBe('taxes');
  });

  it('returns null when no rule matches', () => {
    expect(
      matchCategory('Transferência enviada pelo Pix - João Silva', null, 'outcome', DEFAULTS)
    ).toBeNull();
  });
});

describe('matchCategory rule semantics', () => {
  it('respects the flow constraint', () => {
    const rules: MatchableRule[] = [
      { pattern: 'estorno', matchType: 'contains', category: 'refund', flow: 'income', priority: 10 },
    ];
    expect(matchCategory('Estorno de compra', null, 'income', rules)).toBe('refund');
    expect(matchCategory('Estorno de compra', null, 'outcome', rules)).toBeNull();
  });

  it('evaluates rules by ascending priority (first match wins)', () => {
    const rules: MatchableRule[] = [
      { pattern: 'mercado', matchType: 'contains', category: 'food', flow: null, priority: 20 },
      { pattern: 'supermercado', matchType: 'contains', category: 'shopping', flow: null, priority: 10 },
    ];
    // Both patterns match; priority 10 ("shopping") wins despite array order.
    expect(matchCategory('COVABRA SUPERMERCADOS', null, 'outcome', rules)).toBe('shopping');
  });

  it('matches against the merchant as well as the description', () => {
    const rules: MatchableRule[] = [
      { pattern: 'ifood', matchType: 'contains', category: 'dining', flow: null, priority: 10 },
    ];
    expect(matchCategory('Compra no débito', 'iFood', 'outcome', rules)).toBe('dining');
  });
});
