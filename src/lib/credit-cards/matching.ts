/**
 * Pure helpers for matching a bank-statement payment to a credit-card bill.
 * Candidate pre-filtering (flow, type, date window) happens in the repository;
 * these functions only rank and pick, so they stay easy to unit-test.
 */

import type { CreditCard } from '@/lib/credit-cards/mongodb-documents';

/** Tolerance (centavos) for treating a payment as covering the bill total. */
export function defaultPaymentTolerance(billTotal: number): number {
  // R$5, or 1% of the bill, whichever is larger — absorbs rounding/partial fees.
  return Math.max(500, Math.round(Math.abs(billTotal) * 0.01));
}

/** Orders candidates by closeness to the bill total, then by most recent date. */
export function rankPaymentCandidates(
  candidates: CreditCard.PaymentCandidate[],
  billTotal: number
): CreditCard.PaymentCandidate[] {
  return [...candidates].sort((a, b) => {
    const da = Math.abs(a.value - billTotal);
    const db = Math.abs(b.value - billTotal);
    if (da !== db) return da - db;
    return b.occurredAt.localeCompare(a.occurredAt);
  });
}

/** The best candidate within tolerance of the bill total, or null. */
export function pickSuggestedPayment(
  candidates: CreditCard.PaymentCandidate[],
  billTotal: number,
  tolerance: number = defaultPaymentTolerance(billTotal)
): CreditCard.PaymentCandidate | null {
  const [best] = rankPaymentCandidates(candidates, billTotal);
  if (!best) return null;
  return Math.abs(best.value - billTotal) <= tolerance ? best : null;
}
