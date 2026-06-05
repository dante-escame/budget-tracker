import { describe, it, expect } from 'vitest';
import { statementRowSchema } from '@/lib/entries/schemas';

const validRow = {
  data: '01/05/2026',
  valor: '-115.90',
  identificador: '69f4a22c-4c83-4f39-9525-a5169279e34c',
  descricao: 'Compra no débito - Wellhub',
};

describe('statementRowSchema', () => {
  it('accepts a well-formed row', () => {
    expect(statementRowSchema.safeParse(validRow).success).toBe(true);
  });

  it('rejects a malformed date', () => {
    const result = statementRowSchema.safeParse({ ...validRow, data: '2026-05-01' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Date must be in dd/MM/yyyy format.');
  });

  it('rejects an impossible calendar date', () => {
    const result = statementRowSchema.safeParse({ ...validRow, data: '31/02/2026' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Date is not a valid calendar date.');
  });

  it('rejects a non-numeric amount', () => {
    const result = statementRowSchema.safeParse({ ...validRow, valor: 'R$ 10' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Amount must be a decimal number.');
  });

  it('rejects a non-UUID identifier', () => {
    const result = statementRowSchema.safeParse({ ...validRow, identificador: 'abc' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Identifier must be a valid UUID.');
  });

  it('rejects an empty description', () => {
    const result = statementRowSchema.safeParse({ ...validRow, descricao: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Description is required.');
  });
});
