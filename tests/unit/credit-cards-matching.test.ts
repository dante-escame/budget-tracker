import { describe, it, expect } from 'vitest';

import type { CreditCard } from '@/lib/credit-cards/mongodb-documents';
import {
  defaultPaymentTolerance,
  rankPaymentCandidates,
  pickSuggestedPayment,
} from '@/lib/credit-cards/matching';

function candidate(
  entryId: string,
  value: number,
  occurredAt: string
): CreditCard.PaymentCandidate {
  return { entryId, value, occurredAt, description: 'Pagamento de fatura' };
}

describe('defaultPaymentTolerance', () => {
  it('is the larger of R$5 or 1% of the bill', () => {
    expect(defaultPaymentTolerance(10000)).toBe(500); // 1% = 100 < 500
    expect(defaultPaymentTolerance(200000)).toBe(2000); // 1% = 2000 > 500
  });
});

describe('rankPaymentCandidates', () => {
  it('orders by closeness to the bill total, newest first as a tiebreak', () => {
    const ranked = rankPaymentCandidates(
      [
        candidate('far', 50000, '2026-07-05'),
        candidate('close', 100100, '2026-07-04'),
        candidate('exact-old', 100000, '2026-07-01'),
        candidate('exact-new', 100000, '2026-07-10'),
      ],
      100000
    );

    expect(ranked.map((c) => c.entryId)).toEqual([
      'exact-new',
      'exact-old',
      'close',
      'far',
    ]);
  });
});

describe('pickSuggestedPayment', () => {
  it('returns the best candidate within tolerance', () => {
    const best = pickSuggestedPayment(
      [candidate('a', 99950, '2026-07-05'), candidate('b', 50000, '2026-07-05')],
      100000
    );
    expect(best?.entryId).toBe('a');
  });

  it('returns null when nothing is within tolerance', () => {
    const best = pickSuggestedPayment([candidate('a', 50000, '2026-07-05')], 100000);
    expect(best).toBeNull();
  });

  it('returns null when there are no candidates', () => {
    expect(pickSuggestedPayment([], 100000)).toBeNull();
  });
});
