import { describe, it, expect } from 'vitest';
import {
  inferPaymentType,
  parseStatementDate,
  reaisToCentavos,
  statementRowToDraft,
  toMonthStart,
} from '@/lib/entries/transform';

describe('parseStatementDate', () => {
  it('parses dd/MM/yyyy into a UTC-midnight date', () => {
    const date = parseStatementDate('01/05/2026');
    expect(date.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });
});

describe('reaisToCentavos', () => {
  it('converts negative amounts without float drift', () => {
    expect(reaisToCentavos('-115.90')).toBe(-11590);
  });

  it('converts large positive amounts', () => {
    expect(reaisToCentavos('12683.04')).toBe(1268304);
  });

  it('handles whole-real amounts and single-digit cents', () => {
    expect(reaisToCentavos('-50')).toBe(-5000);
    expect(reaisToCentavos('-30.9')).toBe(-3090);
  });
});

describe('toMonthStart', () => {
  it('returns the first day of the month at UTC midnight', () => {
    expect(toMonthStart(new Date('2026-05-17T12:34:00Z')).toISOString()).toBe(
      '2026-05-01T00:00:00.000Z'
    );
  });
});

describe('inferPaymentType', () => {
  it('detects common Portuguese payment descriptions', () => {
    expect(inferPaymentType('Transferência enviada pelo Pix - Fulano')).toBe('pix');
    expect(inferPaymentType('Compra no débito - Mercado')).toBe('debit_card');
    expect(inferPaymentType('Pagamento de fatura')).toBe('credit_card');
    expect(inferPaymentType('Crédito em conta')).toBe('other');
  });
});

describe('statementRowToDraft', () => {
  it('maps an outcome row to an absolute-centavos draft', () => {
    const draft = statementRowToDraft({
      data: '01/05/2026',
      valor: '-115.90',
      identificador: '69f4a22c-4c83-4f39-9525-a5169279e34c',
      descricao: 'Compra no débito - Wellhub Dante Escame',
    });

    expect(draft.value).toBe(11590);
    expect(draft.flow).toBe('outcome');
    expect(draft.type).toBe('debit_card');
    expect(draft.category).toBe('other_outcome');
    expect(draft.currency).toBe('BRL');
    expect(draft.status).toBe('confirmed');
    expect(draft.externalId).toBe('69f4a22c-4c83-4f39-9525-a5169279e34c');
    expect(draft.merchant).toBe('Wellhub Dante Escame');
    expect(draft.competenceAt.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('maps a positive row to an income draft', () => {
    const draft = statementRowToDraft({
      data: '06/05/2026',
      valor: '12683.04',
      identificador: '69fbb4fa-fe56-49e9-b6b9-3368af934bf8',
      descricao: 'Transferência recebida pelo Pix',
    });

    expect(draft.flow).toBe('income');
    expect(draft.value).toBe(1268304);
    expect(draft.category).toBe('other_income');
  });
});
