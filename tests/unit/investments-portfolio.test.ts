import { describe, it, expect } from 'vitest';

import { buildPortfolio } from '@/lib/investments/portfolio';
import type { Investment } from '@/lib/investments/mongodb-documents';
import type { PositionBase } from '@/lib/investments/repository';

function position(overrides: Partial<PositionBase> = {}): PositionBase {
  return {
    id: 'p1',
    name: 'Tesouro Selic',
    category: 'fixed_income',
    type: 'Selic',
    risk: 'low',
    currentValue: 0,
    currency: 'BRL',
    ...overrides,
  };
}

function application(
  overrides: Partial<Investment.ApplicationRecord> = {}
): Investment.ApplicationRecord {
  return {
    id: 'a1',
    investmentId: 'p1',
    investmentName: 'Tesouro Selic',
    value: 10_000,
    appliedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildPortfolio', () => {
  it('sums applications into total applied and tracks the last application date', () => {
    const [record] = buildPortfolio(
      [position()],
      [
        application({ id: 'a1', value: 10_000, appliedAt: '2026-01-01T00:00:00.000Z' }),
        application({ id: 'a2', value: 25_000, appliedAt: '2026-03-01T00:00:00.000Z' }),
        application({ id: 'a3', value: 5_000, appliedAt: '2026-02-01T00:00:00.000Z' }),
      ]
    );

    expect(record.totalApplied).toBe(40_000);
    expect(record.lastApplicationAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('falls back current value to total applied until a market value is set', () => {
    const [record] = buildPortfolio(
      [position({ currentValue: 0 })],
      [application({ value: 30_000 })]
    );

    expect(record.currentValue).toBe(30_000);
  });

  it('uses the stored market value when present', () => {
    const [record] = buildPortfolio(
      [position({ currentValue: 50_000 })],
      [application({ value: 30_000 })]
    );

    expect(record.currentValue).toBe(50_000);
  });

  it('computes wallet share by current value', () => {
    const records = buildPortfolio(
      [
        position({ id: 'p1', currentValue: 75_000 }),
        position({ id: 'p2', name: 'BTC', category: 'crypto', currentValue: 25_000 }),
      ],
      []
    );

    const byId = new Map(records.map((record) => [record.id, record]));
    expect(byId.get('p1')?.sharePct).toBeCloseTo(75);
    expect(byId.get('p2')?.sharePct).toBeCloseTo(25);
  });

  it('reports zero totals and share for a position with no applications', () => {
    const [record] = buildPortfolio([position({ currentValue: 0 })], []);

    expect(record.totalApplied).toBe(0);
    expect(record.lastApplicationAt).toBeNull();
    expect(record.sharePct).toBe(0);
  });
});
