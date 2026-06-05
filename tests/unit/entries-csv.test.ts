import { describe, it, expect } from 'vitest';
import { parseCsv, parseStatementCsv } from '@/lib/entries/csv';

describe('parseCsv', () => {
  it('parses simple comma-separated rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('honors quoted fields containing commas', () => {
    expect(parseCsv('"a,b",c')).toEqual([['a,b', 'c']]);
  });

  it('unescapes doubled quotes inside quoted fields', () => {
    expect(parseCsv('"she said ""hi""",x')).toEqual([['she said "hi"', 'x']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('parseStatementCsv', () => {
  const sample =
    'Data,Valor,Identificador,Descrição\n' +
    '01/05/2026,-115.90,69f4a22c-4c83-4f39-9525-a5169279e34c,Compra no débito - Wellhub\n' +
    '06/05/2026,12683.04,69fbb4fa-fe56-49e9-b6b9-3368af934bf8,Transferência recebida pelo Pix\n';

  it('skips the header and maps fields by position', () => {
    const rows = parseStatementCsv(sample);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      line: 2,
      data: '01/05/2026',
      valor: '-115.90',
      identificador: '69f4a22c-4c83-4f39-9525-a5169279e34c',
      descricao: 'Compra no débito - Wellhub',
    });
    expect(rows[1].valor).toBe('12683.04');
  });

  it('ignores trailing blank lines', () => {
    const rows = parseStatementCsv(`${sample}\n   \n`);
    expect(rows).toHaveLength(2);
  });
});
