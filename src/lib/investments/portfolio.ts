import type { Investment } from '@/lib/investments/mongodb-documents';
import type { PositionBase } from '@/lib/investments/repository';

/**
 * Combines stored positions with their applications into display records:
 * `totalApplied` is the sum of a position's applications, `lastApplicationAt`
 * the most recent one, `currentValue` falls back to the total applied until a
 * market value is set, and `sharePct` is each position's current value over the
 * wallet total. Pure — no I/O, unit-testable.
 */
export function buildPortfolio(
  positions: PositionBase[],
  applications: Investment.ApplicationRecord[]
): Investment.PositionRecord[] {
  const totals = new Map<
    string,
    { totalApplied: number; lastApplicationAt: string | null }
  >();

  for (const application of applications) {
    if (!application.investmentId) continue;
    const current = totals.get(application.investmentId) ?? {
      totalApplied: 0,
      lastApplicationAt: null,
    };
    if (!application.flow || application.flow === 'outcome') {
      current.totalApplied += application.value;
    }
    if (
      !current.lastApplicationAt ||
      application.appliedAt > current.lastApplicationAt
    ) {
      current.lastApplicationAt = application.appliedAt;
    }
    totals.set(application.investmentId, current);
  }

  const displayValue = (position: PositionBase, totalApplied: number): number =>
    position.currentValue > 0 ? position.currentValue : totalApplied;

  const walletTotal = positions.reduce((sum, position) => {
    const totalApplied = totals.get(position.id)?.totalApplied ?? 0;
    return sum + displayValue(position, totalApplied);
  }, 0);

  return positions.map((position) => {
    const { totalApplied, lastApplicationAt } = totals.get(position.id) ?? {
      totalApplied: 0,
      lastApplicationAt: null,
    };
    const currentValue = displayValue(position, totalApplied);
    const sharePct = walletTotal > 0 ? (currentValue / walletTotal) * 100 : 0;

    return {
      id: position.id,
      name: position.name,
      category: position.category,
      type: position.type,
      risk: position.risk,
      currentValue,
      storedCurrentValue: position.currentValue,
      coinSymbol: position.coinSymbol ?? null,
      quantity: position.quantity ?? null,
      totalApplied,
      lastApplicationAt,
      sharePct,
      currency: position.currency,
    };
  });
}
