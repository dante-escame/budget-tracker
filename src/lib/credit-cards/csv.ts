/**
 * Parser for credit-card bill (fatura) CSV exports.
 *
 * The Nubank fatura template header is `date,title,amount`, where:
 * - `date`   is ISO `yyyy-MM-dd`
 * - `title`  is the transaction description (may carry ` - Parcela x/y`)
 * - `amount` is BR-formatted (`"1.620,74"`), with credits prefixed `"- "`
 *
 * Reuses the dependency-free `parseCsv` core so quoted fields (the BR amounts are
 * quoted because they contain a comma) are handled correctly.
 */

import { parseCsv } from '@/lib/entries/csv';

export interface RawCreditCardRow {
  /** Source line number (1-based, counting the header) for error reporting. */
  line: number;
  date: string;
  title: string;
  amount: string;
}

/**
 * Parses fatura CSV text into typed rows, skipping the header and blank lines.
 * Field values are trimmed; structural validation happens downstream.
 */
export function parseCreditCardCsv(text: string): RawCreditCardRow[] {
  const rows = parseCsv(text);
  const result: RawCreditCardRow[] = [];

  rows.forEach((cells, index) => {
    const line = index + 1;

    // Skip the header row.
    if (index === 0) return;

    // Skip fully blank lines.
    if (cells.every((cell) => cell.trim() === '')) return;

    result.push({
      line,
      date: (cells[0] ?? '').trim(),
      title: (cells[1] ?? '').trim(),
      amount: (cells[2] ?? '').trim(),
    });
  });

  return result;
}
