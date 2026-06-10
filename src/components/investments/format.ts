export function formatCurrency(centavos: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(centavos / 100);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Parses a reais amount (accepts pt-BR format like "1.234,56" or "1234.56") into integer centavos. */
export function reaisToCentavos(value: string): number | null {
  let normalized = value.trim();
  if (normalized === '') return null;
  if (normalized.includes(',')) {
    // pt-BR format: dots are thousands separators, comma is decimal
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
