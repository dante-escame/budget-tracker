import 'server-only';

import { createMongoEntryRepository } from '@/lib/entries/mongodb-repository';
import { createEntryService } from '@/lib/entries/service';
import { instrument } from '@/lib/observability/instrument';

type EntryService = ReturnType<typeof createEntryService>;

declare global {
  var __entryServicePromise__: Promise<EntryService> | undefined;
}

export function getEntryService(): Promise<EntryService> {
  if (!globalThis.__entryServicePromise__) {
    globalThis.__entryServicePromise__ = createMongoEntryRepository().then(
      (repository) =>
        instrument(createEntryService(repository), { domain: 'entries', userIdArg: 0 })
    );
  }

  return globalThis.__entryServicePromise__;
}
