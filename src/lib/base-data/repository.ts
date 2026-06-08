import type { BaseData } from '@/lib/base-data/mongodb-documents';

export interface BaseDataRepository {
  /** The user's base-data config, or null when not configured yet. */
  getBaseData(userId: string): Promise<BaseData.Record | null>;

  /** Creates or updates the user's base-data config and returns it. */
  upsertBaseData(
    userId: string,
    input: BaseData.Input
  ): Promise<BaseData.Record>;
}
