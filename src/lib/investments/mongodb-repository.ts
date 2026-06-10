import 'server-only';

import { ObjectId, type WithId } from 'mongodb';

import { getInvestmentCollections } from '@/lib/investments/mongodb-collections';
import type { Investment } from '@/lib/investments/mongodb-documents';
import type {
  InvestmentRepository,
  PositionBase,
} from '@/lib/investments/repository';

export async function createMongoInvestmentRepository(): Promise<InvestmentRepository> {
  const collections = await getInvestmentCollections();

  return {
    async listPositions(userId): Promise<PositionBase[]> {
      const documents = await collections.positions
        .find({ user_id: parseObjectId(userId), deleted_at: null })
        .sort({ created_at: 1, _id: 1 })
        .toArray();

      return documents.map(mapPositionBase);
    },

    async getPosition(userId, id): Promise<PositionBase | null> {
      if (!ObjectId.isValid(id)) return null;

      const document = await collections.positions.findOne({
        _id: new ObjectId(id),
        user_id: parseObjectId(userId),
        deleted_at: null,
      });

      return document ? mapPositionBase(document) : null;
    },

    async createPosition(userId, input): Promise<PositionBase> {
      const now = new Date();
      const document: Investment.PositionDocument = {
        user_id: parseObjectId(userId),
        name: input.name,
        category: input.category,
        type: input.type,
        risk: input.risk,
        current_value: input.currentValue,
        currency: input.currency,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      const result = await collections.positions.insertOne(document);
      return mapPositionBase({ ...document, _id: result.insertedId });
    },

    async updatePosition(userId, id, input): Promise<PositionBase | null> {
      if (!ObjectId.isValid(id)) return null;

      const update: Partial<Investment.PositionDocument> = {
        updated_at: new Date(),
      };
      if (input.name !== undefined) update.name = input.name;
      if (input.category !== undefined) update.category = input.category;
      if (input.type !== undefined) update.type = input.type;
      if (input.risk !== undefined) update.risk = input.risk;
      if (input.currentValue !== undefined) update.current_value = input.currentValue;

      const document = await collections.positions.findOneAndUpdate(
        { _id: new ObjectId(id), user_id: parseObjectId(userId), deleted_at: null },
        { $set: update },
        { returnDocument: 'after' }
      );

      return document ? mapPositionBase(document) : null;
    },

    async softDeletePosition(userId, id): Promise<boolean> {
      if (!ObjectId.isValid(id)) return false;

      const result = await collections.positions.updateOne(
        { _id: new ObjectId(id), user_id: parseObjectId(userId), deleted_at: null },
        { $set: { deleted_at: new Date(), updated_at: new Date() } }
      );

      return result.modifiedCount === 1;
    },

    async listApplications(userId): Promise<Investment.ApplicationRecord[]> {
      const userObjectId = parseObjectId(userId);

      const positions = await collections.positions
        .find({ user_id: userObjectId })
        .toArray();
      const nameById = new Map(
        positions.map((position) => [
          position._id.toHexString(),
          position.name,
        ])
      );

      const documents = await collections.applications
        .find({ user_id: userObjectId })
        .sort({ applied_at: -1, _id: -1 })
        .toArray();

      return documents.map((document) => {
        const investmentId = document.investment_id.toHexString();
        return {
          id: document._id.toHexString(),
          investmentId,
          investmentName: nameById.get(investmentId) ?? 'Unknown',
          value: document.value,
          flow: document.flow ?? ('outcome' as const),
          appliedAt: document.applied_at.toISOString(),
          source: 'application' as const,
        };
      });
    },

    async createApplication(userId, input): Promise<void> {
      const document: Investment.ApplicationDocument = {
        user_id: parseObjectId(userId),
        investment_id: new ObjectId(input.investmentId),
        value: input.value,
        flow: input.flow,
        applied_at: input.appliedAt,
        entry_id: new ObjectId(input.entryId),
        source: input.source,
        created_at: new Date(),
      };

      await collections.applications.insertOne(document);
    },

    async deleteApplication(
      userId,
      appId
    ): Promise<{ entryId: string; source: 'application' | 'statement_entry' } | null> {
      if (!ObjectId.isValid(appId)) return null;

      const document = await collections.applications.findOneAndDelete({
        _id: new ObjectId(appId),
        user_id: parseObjectId(userId),
      });

      return document
        ? {
            entryId: document.entry_id.toHexString(),
            source: document.source ?? 'application',
          }
        : null;
    },

    async listApplicationEntryIdsForPosition(
      userId,
      positionId
    ): Promise<{ entryId: string; source: 'application' | 'statement_entry' }[]> {
      if (!ObjectId.isValid(positionId)) return [];

      const documents = await collections.applications
        .find({
          user_id: parseObjectId(userId),
          investment_id: new ObjectId(positionId),
        })
        .toArray();

      return documents.map((document) => ({
        entryId: document.entry_id.toHexString(),
        source: document.source ?? 'application',
      }));
    },

    async deleteApplicationsForPosition(userId, positionId): Promise<void> {
      if (!ObjectId.isValid(positionId)) return;

      await collections.applications.deleteMany({
        user_id: parseObjectId(userId),
        investment_id: new ObjectId(positionId),
      });
    },

    async listAllApplicationEntryIds(userId): Promise<string[]> {
      const documents = await collections.applications
        .find({ user_id: parseObjectId(userId) }, { projection: { entry_id: 1 } })
        .toArray();
      return documents.map((doc) => doc.entry_id.toHexString());
    },
  };
}

function mapPositionBase(
  document: WithId<Investment.PositionDocument>
): PositionBase {
  return {
    id: document._id.toHexString(),
    name: document.name,
    category: document.category,
    type: document.type,
    risk: document.risk,
    currentValue: document.current_value,
    currency: document.currency,
  };
}

function parseObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId value: ${value}`);
  }

  return new ObjectId(value);
}
