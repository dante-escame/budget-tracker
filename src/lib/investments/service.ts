import 'server-only';

import type { createEntryService } from '@/lib/entries/service';
import { toMonthStart } from '@/lib/entries/transform';
import type { ManualEntryInput } from '@/lib/entries/repository';
import type { Investment } from '@/lib/investments/mongodb-documents';
import { buildPortfolio } from '@/lib/investments/portfolio';
import type {
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
}

export interface AddApplicationFields {
  value: number; // centavos
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
      return buildPortfolio(positions, applications);
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
      return repository.createPosition(userId, {
        name: input.name,
        category: input.category,
        type: input.type,
        risk: input.risk,
        currentValue: input.currentValue ?? 0,
        currency: DEFAULT_CURRENCY,
      });
    },

    updatePosition(
      userId: string,
      id: string,
      input: UpdatePositionInput
    ): Promise<PositionBase | null> {
      return repository.updatePosition(userId, id, input);
    },

    /** Deletes a position and cascades: soft-deletes linked entries + removes applications. */
    async deletePosition(userId: string, id: string): Promise<boolean> {
      const entryIds = await repository.listApplicationEntryIdsForPosition(
        userId,
        id
      );
      await Promise.all(
        entryIds.map((entryId) => entryService.softDeleteEntry(userId, entryId))
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

      await repository.createApplication(userId, {
        investmentId,
        value: input.value,
        appliedAt: input.appliedAt,
        entryId,
      });

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
        appliedAt: new Date(entry.occurredAt),
        entryId,
      });
      return true;
    },

    /** Removes an application and soft-deletes its linked statement entry. */
    async deleteApplication(userId: string, appId: string): Promise<boolean> {
      const removed = await repository.deleteApplication(userId, appId);
      if (!removed) return false;

      await entryService.softDeleteEntry(userId, removed.entryId);
      return true;
    },
  };
}

function buildInvestmentEntry(
  position: PositionBase,
  input: AddApplicationFields
): ManualEntryInput {
  const description = `Investment application - ${position.name}`;
  const shortDescription =
    description.length <= 80 ? description : `${description.slice(0, 79)}…`;

  return {
    description,
    shortDescription,
    value: input.value,
    flow: 'outcome',
    type: 'other',
    category: 'investment',
    currency: position.currency,
    occurredAt: input.appliedAt,
    competenceAt: toMonthStart(input.appliedAt),
    status: 'confirmed',
    merchant: position.name,
  };
}
