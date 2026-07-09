import 'server-only';

import { createMongoBaseDataRepository } from '@/lib/base-data/mongodb-repository';
import { createBaseDataService } from '@/lib/base-data/service';
import { instrument } from '@/lib/observability/instrument';

type BaseDataService = ReturnType<typeof createBaseDataService>;

declare global {
  var __baseDataServicePromise__: Promise<BaseDataService> | undefined;
}

export function getBaseDataService(): Promise<BaseDataService> {
  if (!globalThis.__baseDataServicePromise__) {
    globalThis.__baseDataServicePromise__ = createMongoBaseDataRepository().then(
      (repository) =>
        instrument(createBaseDataService(repository), {
          domain: 'base-data',
          userIdArg: 0,
        })
    );
  }

  return globalThis.__baseDataServicePromise__;
}
