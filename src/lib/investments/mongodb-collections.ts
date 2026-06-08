import 'server-only';

import type { Collection, Db } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import type { Investment } from '@/lib/investments/mongodb-documents';

export interface InvestmentCollections {
  positions: Collection<Investment.PositionDocument>;
  applications: Collection<Investment.ApplicationDocument>;
}

declare global {
  var __investmentIndexesPromise__: Promise<void> | undefined;
}

export async function getInvestmentCollections(): Promise<InvestmentCollections> {
  const db = await getMongoDb();
  const collections = createInvestmentCollections(db);

  if (!globalThis.__investmentIndexesPromise__) {
    globalThis.__investmentIndexesPromise__ = ensureInvestmentIndexes(collections);
  }

  await globalThis.__investmentIndexesPromise__;

  return collections;
}

function createInvestmentCollections(db: Db): InvestmentCollections {
  return {
    positions: db.collection<Investment.PositionDocument>('investments'),
    applications: db.collection<Investment.ApplicationDocument>(
      'investment_applications'
    ),
  };
}

async function ensureInvestmentIndexes(
  collections: InvestmentCollections
): Promise<void> {
  await collections.positions.createIndexes([
    { key: { user_id: 1 }, name: 'investments_user' },
  ]);

  await collections.applications.createIndexes([
    {
      key: { user_id: 1, applied_at: -1 },
      name: 'investment_applications_user_applied_at',
    },
    {
      key: { investment_id: 1 },
      name: 'investment_applications_investment',
    },
  ]);
}
