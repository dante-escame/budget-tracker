/**
 * Minimal, dependency-free CSV parser for bank-statement files.
 *
 * Handles the standard rules needed for the statement template:
 * - comma-separated fields
 * - double-quoted fields that may contain commas, newlines, or escaped quotes ("")
 * - CRLF or LF line endings
 * - a trailing blank line
 *
 * The statement header is `Data,Valor,Identificador,Descrição`; the header row is
 * skipped and each remaining row is mapped to a `RawStatementRow` by position.
 */

export interface RawStatementRow {
  /** Source line number (1-based, counting the header) for error reporting. */
  line: number;
  data: string;
  valor: string;
  identificador: string;
  descricao: string;
}

/** Splits raw CSV text into rows of string cells, honoring quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let fieldStarted = false;

  const pushField = () => {
    row.push(field);
    field = '';
    fieldStarted = false;
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
      continue;
    }

    if (char === ',') {
      pushField();
      continue;
    }

    if (char === '\r') {
      continue;
    }

    if (char === '\n') {
      pushRow();
      continue;
    }

    field += char;
    fieldStarted = true;
  }

  // Flush the final field/row if the file does not end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

/**
 * Parses statement CSV text into typed rows, skipping the header and any blank
 * lines. Field values are trimmed; structural validation happens downstream.
 */
export function parseStatementCsv(text: string): RawStatementRow[] {
  const rows = parseCsv(text);
  const result: RawStatementRow[] = [];

  rows.forEach((cells, index) => {
    const line = index + 1;

    // Skip the header row.
    if (index === 0) return;

    // Skip fully blank lines.
    if (cells.every((cell) => cell.trim() === '')) return;

    result.push({
      line,
      data: (cells[0] ?? '').trim(),
      valor: (cells[1] ?? '').trim(),
      identificador: (cells[2] ?? '').trim(),
      descricao: (cells[3] ?? '').trim(),
    });
  });

  return result;
}
