import 'server-only';

import { createMongoBaseDataRepository } from '@/lib/base-data/mongodb-repository';
import { createBaseDataService } from '@/lib/base-data/service';

type BaseDataService = ReturnType<typeof createBaseDataService>;

declare global {
  var __baseDataServicePromise__: Promise<BaseDataService> | undefined;
}

export function getBaseDataService(): Promise<BaseDataService> {
  if (!globalThis.__baseDataServicePromise__) {
    globalThis.__baseDataServicePromise__ = createMongoBaseDataRepository().then(
      (repository) => createBaseDataService(repository)
    );
  }

  return globalThis.__baseDataServicePromise__;
}
