import 'server-only';

import type { createEntryService } from '@/lib/entries/service';
import { toMonthStart } from '@/lib/entries/transform';
import type { ManualEntryInput } from '@/lib/entries/repository';
import type { Investment } from '@/lib/investments/mongodb-documents';
import { getB3QuotesBRL } from '@/lib/investments/b3-quotes';
import { getCryptoQuotesBRL } from '@/lib/investments/crypto-quotes';
import { getDollarQuoteBRL } from '@/lib/investments/dollar-quote';
import { buildPortfolio } from '@/lib/investments/portfolio';
import type {
  CreatePositionInput,
  InvestmentRepository,
  PositionBase,
  UpdatePositionInput,
} from '@/lib/investments/repository';

type EntryService = ReturnType<typeof createEntryService>;

const DEFAULT_CURRENCY = 'BRL';

export interface CreatePositionFields {
  name: string;
  category: Investment.Category;
  type: string;
  risk: Investment.Risk;
  currentValue?: number; // centavos
  coinSymbol?: string | null;
  tickerSymbol?: string | null;
  quantity?: number | null;
}

export interface AddApplicationFields {
  value: number; // centavos
  flow: 'income' | 'outcome';
  appliedAt: Date;
}

export function createInvestmentService(
  repository: InvestmentRepository,
  entryService: EntryService
) {
  return {
    /** Positions with computed totals + wallet share, plus the application history. */
    async listPortfolio(userId: string): Promise<Investment.PositionRecord[]> {
      const [positions, applications] = await Promise.all([
        repository.listPositions(userId),
        repository.listApplications(userId),
      ]);
      const priced = await applyB3Quotes(
        await applyDollarQuote(await applyCryptoQuotes(positions))
      );
      return buildPortfolio(priced, applications);
    },

    async listApplications(userId: string): Promise<Investment.ApplicationRecord[]> {
      const [linked, allEntryIds, investmentEntries] = await Promise.all([
        repository.listApplications(userId),
        repository.listAllApplicationEntryIds(userId),
        entryService.listInvestmentOutcomes(userId),
      ]);

      const linkedSet = new Set(allEntryIds);
      const unlinked: Investment.ApplicationRecord[] = investmentEntries
        .filter((entry) => !linkedSet.has(entry.id))
        .map((entry) => ({
          id: entry.id,
          investmentId: null,
          investmentName: entry.merchant ?? entry.description,
          entryDescription: entry.description,
          value: entry.value,
          flow: 'outcome' as const,
          appliedAt: entry.occurredAt,
          source: 'statement_entry' as const,
        }));

      return [...linked, ...unlinked].sort(
        (a, b) => b.appliedAt.localeCompare(a.appliedAt)
      );
    },

    createPosition(
      userId: string,
      input: CreatePositionFields
    ): Promise<PositionBase> {
      return repository.createPosition(userId, toCreateInput(input));
    },

    /** Creates several positions in one atomic batch (the bulk add form). */
    createPositions(
      userId: string,
      inputs: CreatePositionFields[]
    ): Promise<PositionBase[]> {
      return repository.createPositions(userId, inputs.map(toCreateInput));
    },

    updatePosition(
      userId: string,
      id: string,
      input: UpdatePositionInput
    ): Promise<PositionBase | null> {
      return repository.updatePosition(userId, id, input);
    },

    /** Deletes a position and cascades: soft-deletes owned entries + removes applications. */
    async deletePosition(userId: string, id: string): Promise<boolean> {
      const applicationEntries = await repository.listApplicationEntryIdsForPosition(
        userId,
        id
      );
      await Promise.all(
        applicationEntries
          .filter((entry) => entry.source === 'application')
          .map((entry) => entryService.softDeleteEntry(userId, entry.entryId))
      );
      await repository.deleteApplicationsForPosition(userId, id);
      return repository.softDeletePosition(userId, id);
    },

    /**
     * Records an application (aporte) and a linked `outcome` entry so the money
     * leaving the account appears in the statement. Returns false when the
     * position doesn't exist.
     */
    async addApplication(
      userId: string,
      investmentId: string,
      input: AddApplicationFields
    ): Promise<boolean> {
      const position = await repository.getPosition(userId, investmentId);
      if (!position) return false;

      const { id: entryId } = await entryService.createEntry(
        userId,
        buildInvestmentEntry(position, input)
      );

      try {
        await repository.createApplication(userId, {
          investmentId,
          value: input.value,
          flow: input.flow,
          appliedAt: input.appliedAt,
          entryId,
          source: 'application',
        });
      } catch (error) {
        await entryService.softDeleteEntry(userId, entryId);
        throw error;
      }

      return true;
    },

    /**
     * Links an existing statement entry (already in the entries collection) to an
     * investment position by creating an ApplicationDocument. The entry is not
     * duplicated. Returns false when the position or entry doesn't exist.
     */
    async linkEntryToInvestment(
      userId: string,
      investmentId: string,
      entryId: string
    ): Promise<boolean> {
      const [position, entry] = await Promise.all([
        repository.getPosition(userId, investmentId),
        entryService.getEntry(userId, entryId),
      ]);
      if (!position || !entry) return false;

      await repository.createApplication(userId, {
        investmentId,
        value: entry.value,
        flow: entry.flow ?? 'outcome',
        appliedAt: new Date(entry.occurredAt),
        entryId,
        source: 'statement_entry',
      });
      return true;
    },

    /** Removes an application. Only soft-deletes the linked entry when it was created by this application. */
    async deleteApplication(userId: string, appId: string): Promise<boolean> {
      const removed = await repository.deleteApplication(userId, appId);
      if (!removed) return false;

      if (removed.source === 'application') {
        await entryService.softDeleteEntry(userId, removed.entryId);
      }
      return true;
    },
  };
}

function toCreateInput(input: CreatePositionFields): CreatePositionInput {
  // Crypto, dollar and B3 (stocks/FIIs) positions are all valued from a live
  // quote (coin/USD/share × quantity), so they store a `quantity` and never a
  // manual `currentValue`. Crypto carries a `coinSymbol`; stocks/reits carry a
  // `tickerSymbol`.
  const isCrypto = input.category === 'crypto';
  const isB3 = input.category === 'stocks' || input.category === 'reits';
  const isQuoteDerived = isCrypto || input.category === 'dollar' || isB3;
  return {
    name: input.name,
    category: input.category,
    type: input.type,
    risk: input.risk,
    currentValue: isQuoteDerived ? 0 : input.currentValue ?? 0,
    coinSymbol: isCrypto ? input.coinSymbol ?? null : null,
    tickerSymbol: isB3 ? input.tickerSymbol ?? null : null,
    quantity: isQuoteDerived ? input.quantity ?? null : null,
    currency: DEFAULT_CURRENCY,
  };
}

/**
 * Replaces each crypto position's `currentValue` with `quantity × live BRL
 * price` (centavos), fetched through the 30-min cached quote service. Positions
 * without a usable quote keep `currentValue = 0`, which falls back to the total
 * applied in `buildPortfolio`. Keeps `buildPortfolio` pure (no I/O there).
 */
async function applyCryptoQuotes(
  positions: PositionBase[]
): Promise<PositionBase[]> {
  const symbols = positions
    .filter((position) => position.category === 'crypto' && position.coinSymbol)
    .map((position) => position.coinSymbol as string);

  if (symbols.length === 0) return positions;

  const quotes = await getCryptoQuotesBRL(symbols);

  return positions.map((position) => {
    if (
      position.category !== 'crypto' ||
      !position.coinSymbol ||
      !position.quantity
    ) {
      return position;
    }

    const price = quotes.get(position.coinSymbol);
    if (price === undefined) return position;

    return {
      ...position,
      currentValue: Math.round(position.quantity * price * 100),
    };
  });
}

/**
 * Replaces each dollar position's `currentValue` with `quantity × live USD→BRL
 * rate` (centavos), fetched through the 30-min cached quote service. When no
 * rate is available the positions are returned untouched (their fallback value
 * is kept). Keeps `buildPortfolio` pure (no I/O there).
 */
async function applyDollarQuote(
  positions: PositionBase[]
): Promise<PositionBase[]> {
  const hasDollar = positions.some(
    (position) => position.category === 'dollar' && position.quantity
  );
  if (!hasDollar) return positions;

  const rate = await getDollarQuoteBRL();
  if (rate === null) return positions;

  return positions.map((position) => {
    if (position.category !== 'dollar' || !position.quantity) {
      return position;
    }

    return {
      ...position,
      currentValue: Math.round(position.quantity * rate * 100),
    };
  });
}

/**
 * Replaces each stock/FII position's `currentValue` with `quantity × live BRL
 * share price` (centavos), fetched through the 30-min cached B3 quote service.
 * Positions without a usable quote keep `currentValue = 0`, which falls back to
 * the total applied in `buildPortfolio`. Keeps `buildPortfolio` pure (no I/O
 * there). Both `stocks` and `reits` (FIIs) are priced from B3.
 */
async function applyB3Quotes(
  positions: PositionBase[]
): Promise<PositionBase[]> {
  const tickers = positions
    .filter(
      (position) =>
        (position.category === 'stocks' || position.category === 'reits') &&
        position.tickerSymbol
    )
    .map((position) => position.tickerSymbol as string);

  if (tickers.length === 0) return positions;

  const quotes = await getB3QuotesBRL(tickers);

  return positions.map((position) => {
    if (
      (position.category !== 'stocks' && position.category !== 'reits') ||
      !position.tickerSymbol ||
      !position.quantity
    ) {
      return position;
    }

    const price = quotes.get(position.tickerSymbol);
    if (price === undefined) return position;

    return {
      ...position,
      currentValue: Math.round(position.quantity * price * 100),
    };
  });
}

function buildInvestmentEntry(
  position: PositionBase,
  input: AddApplicationFields
): ManualEntryInput {
  const isIncome = input.flow === 'income';
  const description = isIncome
    ? `Investment return - ${position.name}`
    : `Investment application - ${position.name}`;
  const shortDescription =
    description.length <= 80 ? description : `${description.slice(0, 79)}…`;

  return {
    description,
    shortDescription,
    value: input.value,
    flow: input.flow,
    type: 'other',
    category: isIncome ? 'investment_return' : 'investment',
    currency: position.currency,
    occurredAt: input.appliedAt,
    competenceAt: toMonthStart(input.appliedAt),
    status: 'confirmed',
    merchant: position.name,
  };
}
