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

/** Parses a reais amount (dot decimal, e.g. "1234.56") into integer centavos. */
export function reaisToCentavos(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
