import { describe, it, expect } from 'vitest';

import { fixedExpenseSignature } from '@/lib/fixed-expenses/signature';

describe('fixedExpenseSignature', () => {
  it('keys on the normalized merchant when present', () => {
    expect(fixedExpenseSignature('Netflix', 'Pagamento de fatura - Netflix')).toBe(
      'netflix'
    );
  });

  it('is tolerant of casing and accents so the same merchant matches', () => {
    expect(fixedExpenseSignature('SAÚDE Plano', 'x')).toBe(
      fixedExpenseSignature('saude plano', 'y')
    );
  });

  it('falls back to the description when there is no merchant', () => {
    expect(fixedExpenseSignature(null, 'Aluguel mensal')).toBe('aluguel mensal');
    expect(fixedExpenseSignature('   ', 'Aluguel mensal')).toBe('aluguel mensal');
  });

  it('collapses whitespace', () => {
    expect(fixedExpenseSignature('  Spotify   Premium  ', 'x')).toBe(
      'spotify premium'
    );
  });
});
