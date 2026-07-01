import 'server-only';

import { getEntryService } from '@/lib/entries/runtime';
import { createMongoInvestmentRepository } from '@/lib/investments/mongodb-repository';
import { createInvestmentService } from '@/lib/investments/service';
import { instrument } from '@/lib/observability/instrument';

type InvestmentService = ReturnType<typeof createInvestmentService>;

declare global {
  var __investmentServicePromise__: Promise<InvestmentService> | undefined;
}

export function getInvestmentService(): Promise<InvestmentService> {
  if (!globalThis.__investmentServicePromise__) {
    globalThis.__investmentServicePromise__ = Promise.all([
      createMongoInvestmentRepository(),
      getEntryService(),
    ])
      .then(([repository, entryService]) =>
        instrument(createInvestmentService(repository, entryService), {
          domain: 'investments',
        })
      )
      .catch((error) => {
        globalThis.__investmentServicePromise__ = undefined;
        throw error;
      });
  }

  return globalThis.__investmentServicePromise__;
}
