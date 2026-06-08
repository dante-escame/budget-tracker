import { describe, it, expect } from 'vitest';

import { computeBillTotal } from '@/lib/credit-cards/transform';

describe('computeBillTotal', () => {
  it('sums charges and excludes the payment-received line', () => {
    const total = computeBillTotal([
      { description: 'Pagamento recebido', flow: 'income', value: 333175 },
      { description: 'Netflix.Com', flow: 'outcome', value: 5990 },
      { description: 'Amazon - Parcela 1/6', flow: 'outcome', value: 5300 },
    ]);

    // Only the two charges count; the payment-received credit is ignored.
    expect(total).toBe(11290);
  });

  it('lets genuine refunds net against their charge', () => {
    const total = computeBillTotal([
      { description: 'IOF de compra internacional', flow: 'outcome', value: 401 },
      { description: 'IOF de volta de Claude.Ai', flow: 'income', value: 401 },
      { description: 'Claude.Ai Subscription', flow: 'outcome', value: 11471 },
    ]);

    expect(total).toBe(11471);
  });

  it('is zero for an empty bill', () => {
    expect(computeBillTotal([])).toBe(0);
  });
});
