import { normalizeText } from '@/lib/entries/categorize';

/**
 * Stable key used to recognise the *same* recurring expense across monthly
 * imports. The statement CSV's per-transaction UUID never repeats, so we key on
 * the normalized merchant/counterparty (falling back to the full description
 * when no merchant was extracted). Pure — safe to use on server and in tests.
 */
export function fixedExpenseSignature(
  merchant: string | null | undefined,
  description: string
): string {
  const basis = merchant && merchant.trim() ? merchant : description;
  return normalizeText(basis);
}
