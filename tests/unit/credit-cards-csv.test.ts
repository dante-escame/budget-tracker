import { describe, it, expect } from 'vitest';

import { parseCreditCardCsv } from '@/lib/credit-cards/csv';

describe('parseCreditCardCsv', () => {
  it('skips the header and parses quoted BR amounts', () => {
    const csv = [
      'date,title,amount',
      '2026-06-05,Pagamento recebido,"- 3.331,75"',
      '2026-06-03,Amazon - Parcela 1/6,"53,00"',
    ].join('\n');

    const rows = parseCreditCardCsv(csv);

    expect(rows).toEqual([
      { line: 2, date: '2026-06-05', title: 'Pagamento recebido', amount: '- 3.331,75' },
      { line: 3, date: '2026-06-03', title: 'Amazon - Parcela 1/6', amount: '53,00' },
    ]);
  });

  it('skips fully blank lines and tolerates a trailing newline', () => {
    const csv = 'date,title,amount\n2026-05-09,Netflix.Com,"59,90"\n\n';

    const rows = parseCreditCardCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Netflix.Com');
  });

  it('returns an empty list when only the header is present', () => {
    expect(parseCreditCardCsv('date,title,amount\n')).toEqual([]);
  });
});
