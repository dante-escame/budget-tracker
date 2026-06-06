import { describe, it, expect } from 'vitest';

import {
  brAmountToCentavos,
  parseIsoDate,
  extractCardMerchant,
  parseInstallment,
  isPaymentReceivedLine,
  creditCardRowsToDrafts,
  creditCardRowToDraft,
} from '@/lib/credit-cards/transform';

const ctx = { cardLabel: 'Nubank', billMonth: { year: 2026, month: 6 } };

describe('brAmountToCentavos', () => {
  it('parses thousands and decimals', () => {
    expect(brAmountToCentavos('1.620,74')).toBe(162074);
    expect(brAmountToCentavos('408,35')).toBe(40835);
    expect(brAmountToCentavos('53,00')).toBe(5300);
  });

  it('parses credit-signed amounts with a leading "- "', () => {
    expect(brAmountToCentavos('- 3.331,75')).toBe(-333175);
    expect(brAmountToCentavos('- 4,01')).toBe(-401);
  });
});

describe('parseIsoDate', () => {
  it('parses yyyy-MM-dd at UTC midnight', () => {
    const date = parseIsoDate('2026-05-09');
    expect(date.toISOString()).toBe('2026-05-09T00:00:00.000Z');
  });
});

describe('extractCardMerchant', () => {
  it('takes the first segment and drops a trailing installment', () => {
    expect(extractCardMerchant('Amazon - Parcela 1/6')).toBe('Amazon');
    expect(extractCardMerchant('Dr. Juliano Bullamah - Parcela 1/6')).toBe(
      'Dr. Juliano Bullamah'
    );
    expect(extractCardMerchant('Netflix.Com')).toBe('Netflix.Com');
  });
});

describe('parseInstallment', () => {
  it('extracts the installment number and total', () => {
    expect(parseInstallment('Amazon - Parcela 1/6')).toEqual({ number: 1, total: 6 });
    expect(parseInstallment('Qatar Airway7lvfrp - Parcela 4/5')).toEqual({
      number: 4,
      total: 5,
    });
  });

  it('returns null when there is no installment', () => {
    expect(parseInstallment('Netflix.Com')).toBeNull();
  });
});

describe('isPaymentReceivedLine', () => {
  it('matches the payment-received credit line', () => {
    expect(isPaymentReceivedLine('Pagamento recebido')).toBe(true);
    expect(isPaymentReceivedLine('Amazon - Parcela 1/6')).toBe(false);
  });
});

describe('creditCardRowToDraft', () => {
  it('maps a charge to an outcome and a credit to an income', () => {
    const charge = creditCardRowToDraft(
      { date: '2026-05-09', title: 'Netflix.Com', amount: '59,90' },
      ctx,
      0
    );
    expect(charge.flow).toBe('outcome');
    expect(charge.value).toBe(5990);
    expect(charge.type).toBe('credit_card');
    expect(charge.source).toBe('credit_card_bill');
    expect(charge.competenceAt.toISOString()).toBe('2026-06-01T00:00:00.000Z');

    const credit = creditCardRowToDraft(
      { date: '2026-05-16', title: 'IOF de volta', amount: '- 4,01' },
      ctx,
      0
    );
    expect(credit.flow).toBe('income');
    expect(credit.value).toBe(401);
  });
});

describe('creditCardRowsToDrafts', () => {
  const rows = [
    { date: '2026-05-09', title: 'Netflix.Com', amount: '59,90' },
    { date: '2026-05-09', title: 'Netflix.Com', amount: '59,90' },
    { date: '2026-05-10', title: 'Amazon', amount: '53,00' },
  ];

  it('produces stable external ids across re-imports', () => {
    const a = creditCardRowsToDrafts(rows, ctx).map((d) => d.externalId);
    const b = creditCardRowsToDrafts(rows, ctx).map((d) => d.externalId);
    expect(a).toEqual(b);
  });

  it('disambiguates identical rows with an occurrence index', () => {
    const ids = creditCardRowsToDrafts(rows, ctx).map((d) => d.externalId);
    // The two identical Netflix rows differ only by the trailing dup index.
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0].endsWith(':0')).toBe(true);
    expect(ids[1].endsWith(':1')).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });
});
