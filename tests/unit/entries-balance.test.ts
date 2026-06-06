import { describe, it, expect } from 'vitest';

import { createEntryService } from '@/lib/entries/service';
import type { EntryRepository } from '@/lib/entries/repository';
import type { EntryDraft } from '@/lib/entries/transform';
import type { Entry } from '@/lib/entries/mongodb-documents';

const USER = 'u1';

// Signed monthly nets (centavos) keyed by YYYY-MM, used by the fake repository to
// answer sumNetInRange over a competence-date range.
const MONTHLY_NET: Record<string, number> = {
  '2026-01': 5000,
  '2026-02': -2000,
  '2026-03': 3000,
};

function fakeBalanceRepo(): EntryRepository {
  return {
    async sumNetInRange(_userId: string, start: Date, end: Date) {
      let sum = 0;
      for (const [key, net] of Object.entries(MONTHLY_NET)) {
        const [year, month] = key.split('-').map(Number);
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        if (monthStart >= start && monthStart < end) sum += net;
      }
      return sum;
    },
  } as unknown as EntryRepository;
}

describe('computeMonthBalance', () => {
  const service = createEntryService(fakeBalanceRepo());
  const baseMonth = { year: 2026, month: 1 };
  const baseline = 100000; // R$1000.00

  it('accumulates net across months on top of the baseline', async () => {
    const result = await service.computeMonthBalance(
      USER,
      baseMonth,
      baseline,
      { year: 2026, month: 2 }
    );
    // Starting = baseline + Jan net; Ending = baseline + Jan + Feb net.
    expect(result).toEqual({ startingBalance: 105000, endingBalance: 103000 });
  });

  it('opens the base month at the baseline', async () => {
    const result = await service.computeMonthBalance(USER, baseMonth, baseline, baseMonth);
    expect(result.startingBalance).toBe(baseline);
    expect(result.endingBalance).toBe(105000); // baseline + Jan net
  });

  it('returns the baseline for a month before the base month', async () => {
    const result = await service.computeMonthBalance(
      USER,
      baseMonth,
      baseline,
      { year: 2025, month: 12 }
    );
    expect(result).toEqual({ startingBalance: baseline, endingBalance: baseline });
  });
});

function fakeImportRepo(captured: EntryDraft[]): EntryRepository {
  return {
    async listTaggingRules() {
      return [];
    },
    async bulkUpsertByExternalId(_userId: string, drafts: EntryDraft[]) {
      captured.push(...drafts);
      return { inserted: drafts.length, skipped: 0 };
    },
  } as unknown as EntryRepository;
}

describe('importStatement base-month restriction', () => {
  const CSV = [
    'Data,Valor,Identificador,Descrição',
    '15/12/2025,-50.00,11111111-1111-4111-8111-111111111111,Old purchase',
    '10/02/2026,-30.00,22222222-2222-4222-8222-222222222222,New purchase',
  ].join('\n');

  it('skips rows before the base month and imports the rest', async () => {
    const captured: EntryDraft[] = [];
    const service = createEntryService(fakeImportRepo(captured));

    const summary = await service.importStatement(USER, CSV, {
      baseMonthStart: new Date(Date.UTC(2026, 0, 1)),
    });

    expect(summary.inserted).toBe(1);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.description).toBe('New purchase');
    expect(summary.errors).toEqual([
      { line: 2, message: 'Before your base month — not imported.' },
    ]);
  });

  it('imports every row when no base month is set', async () => {
    const captured: EntryDraft[] = [];
    const service = createEntryService(fakeImportRepo(captured));

    const summary = await service.importStatement(USER, CSV);

    expect(summary.inserted).toBe(2);
    expect(captured).toHaveLength(2);
    expect(summary.errors).toHaveLength(0);
  });
});

const EXISTING_ENTRY: Entry.Record = {
  id: 'e1',
  description: 'Old text',
  shortDescription: 'Old text',
  value: 5000,
  flow: 'outcome',
  type: 'pix',
  category: 'other_outcome',
  currency: 'BRL',
  occurredAt: '2026-02-10T00:00:00.000Z',
  status: 'confirmed',
  merchant: null,
};

const DINING_RULE: Entry.TaggingRuleRecord = {
  id: 'r1',
  pattern: 'ifood',
  matchType: 'contains',
  category: 'dining',
  flow: null,
  priority: 10,
};

type UpdateFields = { description?: string; category?: Entry.Category };

function fakeUpdateRepo(
  rules: Entry.TaggingRuleRecord[],
  capturedFields: { value: UpdateFields }
): EntryRepository {
  return {
    async getEntryById() {
      return EXISTING_ENTRY;
    },
    async listTaggingRules() {
      return rules;
    },
    async updateEntryFields(_userId: string, _entryId: string, fields: UpdateFields) {
      capturedFields.value = fields;
      return { ...EXISTING_ENTRY, ...fields };
    },
  } as unknown as EntryRepository;
}

describe('updateEntry re-tagging', () => {
  it('re-applies rules and auto-sets the category when only the description changes', async () => {
    const captured: { value: UpdateFields } = { value: {} };
    const service = createEntryService(fakeUpdateRepo([DINING_RULE], captured));

    await service.updateEntry(USER, 'e1', { description: 'iFood delivery' });

    expect(captured.value.category).toBe('dining');
  });

  it('honors an explicit category over the rules', async () => {
    const captured: { value: UpdateFields } = { value: {} };
    const service = createEntryService(fakeUpdateRepo([DINING_RULE], captured));

    await service.updateEntry(USER, 'e1', {
      description: 'iFood delivery',
      category: 'shopping',
    });

    expect(captured.value.category).toBe('shopping');
  });

  it('leaves the category untouched when no rule matches the new description', async () => {
    const captured: { value: UpdateFields } = { value: {} };
    const service = createEntryService(fakeUpdateRepo([DINING_RULE], captured));

    await service.updateEntry(USER, 'e1', { description: 'Random purchase' });

    expect(captured.value.category).toBeUndefined();
  });
});
