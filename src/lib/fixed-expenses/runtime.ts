import 'server-only';

import { getEntryService } from '@/lib/entries/runtime';
import { createMongoFixedExpenseRepository } from '@/lib/fixed-expenses/mongodb-repository';
import { createFixedExpenseService } from '@/lib/fixed-expenses/service';

type FixedExpenseService = ReturnType<typeof createFixedExpenseService>;

declare global {
  var __fixedExpenseServicePromise__: Promise<FixedExpenseService> | undefined;
}

export function getFixedExpenseService(): Promise<FixedExpenseService> {
  if (!globalThis.__fixedExpenseServicePromise__) {
    globalThis.__fixedExpenseServicePromise__ = Promise.all([
      createMongoFixedExpenseRepository(),
      getEntryService(),
    ]).then(([repository, entryService]) =>
      createFixedExpenseService(repository, entryService)
    );
  }

  return globalThis.__fixedExpenseServicePromise__;
}
