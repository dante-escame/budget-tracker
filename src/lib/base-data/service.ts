import 'server-only';

import type { BaseData } from '@/lib/base-data/mongodb-documents';
import type { BaseDataRepository } from '@/lib/base-data/repository';

export function createBaseDataService(repository: BaseDataRepository) {
  return {
    getBaseData(userId: string): Promise<BaseData.Record | null> {
      return repository.getBaseData(userId);
    },

    setBaseData(
      userId: string,
      input: BaseData.Input
    ): Promise<BaseData.Record> {
      return repository.upsertBaseData(userId, input);
    },
  };
}
