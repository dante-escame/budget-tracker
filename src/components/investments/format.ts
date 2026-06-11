import type { Investment } from '@/lib/investments';

export function formatCurrency(centavos: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(centavos / 100);
}

/**
 * The "Total Applied" cell. Quote-derived assets show the real holding in their
 * own unit — crypto as `quantity + symbol` (e.g. "0,5 BTC") and dollar as a USD
 * amount (e.g. "US$ 100,00") — since that's what the user actually entered.
 * Every other category keeps the BRL sum of its applications.
 */
export function formatTotalApplied(position: Investment.PositionRecord): string {
  if (position.category === 'dollar' && position.quantity != null) {
    return formatCurrency(Math.round(position.quantity * 100), 'USD');
  }
  if (
    position.category === 'crypto' &&
    position.coinSymbol &&
    position.quantity != null
  ) {
    const amount = position.quantity.toLocaleString('pt-BR', {
      maximumFractionDigits: 8,
    });
    return `${amount} ${position.coinSymbol}`;
  }
  return formatCurrency(position.totalApplied, position.currency);
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

/**
 * Parses a crypto quantity (accepts a comma or dot decimal separator) into a
 * positive number with at most `maxDecimals` decimal places. Returns null when
 * empty, non-numeric, not positive, or too precise.
 */
export function parseCryptoQuantity(
  value: string,
  maxDecimals: number
): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;

  const decimals = normalized.split('.')[1]?.length ?? 0;
  if (decimals > maxDecimals) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}
