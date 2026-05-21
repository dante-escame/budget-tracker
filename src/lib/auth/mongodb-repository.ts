import 'server-only';

import {
  MongoServerError,
  ObjectId,
  type InsertOneResult,
  type OptionalId,
  type WithId,
} from 'mongodb';

import type {
  AuthRepository,
  UpdateAuthUserInput,
} from '@/lib/auth/repository';
import { getAuthCollections } from '@/lib/auth/mongodb-collections';
import type {
  AuthEventDocument,
  PasswordResetTokenDocument,
  SessionDocument,
  UserDocument,
  VerificationTokenDocument,
} from '@/lib/auth/mongodb-documents';
import type { Auth } from '@/lib/auth/types';

export async function createMongoAuthRepository(): Promise<AuthRepository> {
  const collections = await getAuthCollections();

  return {
    async findUserById(userId) {
      return findUserById(collections.users, userId);
    },

    async findUserByEmailNormalized(emailNormalized) {
      const document = await collections.users.findOne({
        email_normalized: emailNormalized,
      });

      return document ? mapUserDocument(document) : null;
    },

    async createUser(input) {
      const now = new Date();
      const document: OptionalId<UserDocument> = {
        email_normalized: input.emailNormalized,
        email_display: input.emailDisplay,
        password_hash: input.passwordHash,
        email_verified_at: null,
        mfa_enrolled_at: null,
        created_at: now,
        updated_at: now,
        last_login_at: null,
        status: input.status,
      };

      try {
        const result = await collections.users.insertOne(document);
        const created = withInsertedId(document, result);

        return mapUserDocument(created);
      } catch (error) {
        handleDuplicateKey(error, 'A user with that email already exists.');
      }
    },

    async updateUser(userId, input) {
      const objectId = parseObjectId(userId);
      const updateDocument = buildUserUpdate(input);
      const result = await collections.users.findOneAndUpdate(
        { _id: objectId },
        { $set: updateDocument },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error(`User not found for id ${userId}.`);
      }

      return mapUserDocument(result);
    },

    async createSession(input) {
      const document: OptionalId<SessionDocument> = {
        user_id: parseObjectId(input.userId),
        token_hash: input.tokenHash,
        created_at: input.createdAt,
        last_seen_at: input.lastSeenAt,
        expires_at: input.expiresAt,
        ip_hash: input.ipHash,
        user_agent: input.userAgent,
        level: input.level,
        recent_auth_at: input.recentAuthAt,
      };

      try {
        const result = await collections.sessions.insertOne(document);
        const created = withInsertedId(document, result);

        return mapSessionDocument(created);
      } catch (error) {
        handleDuplicateKey(error, 'A session with that token hash already exists.');
      }
    },

    async findSessionByTokenHash(tokenHash) {
      const document = await collections.sessions.findOne({
        token_hash: tokenHash,
      });

      return document ? mapSessionDocument(document) : null;
    },

    async updateSession(sessionId, input) {
      const objectId = parseObjectId(sessionId);
      const updateDocument = buildSessionUpdate(input);
      const result = await collections.sessions.findOneAndUpdate(
        { _id: objectId },
        { $set: updateDocument },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error(`Session not found for id ${sessionId}.`);
      }

      return mapSessionDocument(result);
    },

    async deleteSession(sessionId) {
      await collections.sessions.deleteOne({ _id: parseObjectId(sessionId) });
    },

    async deleteSessionsByUserId(userId) {
      const result = await collections.sessions.deleteMany({
        user_id: parseObjectId(userId),
      });

      return result.deletedCount ?? 0;
    },

    async createIssuedToken(input) {
      const collection = getTokenCollection(collections, input.kind);
      const document: OptionalId<VerificationTokenDocument | PasswordResetTokenDocument> = {
        user_id: parseObjectId(input.userId),
        token_hash: input.tokenHash,
        created_at: input.createdAt,
        expires_at: input.expiresAt,
        used_at: null,
      };

      try {
        const result = await collection.insertOne(document);
        const created = withInsertedId(document, result);

        return mapIssuedTokenDocument(input.kind, created);
      } catch (error) {
        handleDuplicateKey(error, 'A token with that hash already exists.');
      }
    },

    async findIssuedTokenByHash(kind, tokenHash) {
      const collection = getTokenCollection(collections, kind);
      const document = await collection.findOne({
        token_hash: tokenHash,
      });

      return document ? mapIssuedTokenDocument(kind, document) : null;
    },

    async markIssuedTokenUsed(tokenId, usedAt) {
      const objectId = parseObjectId(tokenId);
      const [verificationResult, resetResult] = await Promise.all([
        collections.emailVerificationTokens.updateOne(
          { _id: objectId },
          { $set: { used_at: usedAt } }
        ),
        collections.passwordResetTokens.updateOne(
          { _id: objectId },
          { $set: { used_at: usedAt } }
        ),
      ]);

      if (!verificationResult.matchedCount && !resetResult.matchedCount) {
        throw new Error(`Issued token not found for id ${tokenId}.`);
      }
    },

    async deleteIssuedTokensByUserIdAndKind(userId, kind) {
      const collection = getTokenCollection(collections, kind);
      const result = await collection.deleteMany({
        user_id: parseObjectId(userId),
      });

      return result.deletedCount ?? 0;
    },

    async createAuthEvent(event) {
      const document: OptionalId<AuthEventDocument> = {
        user_id: event.userId ? parseObjectId(event.userId) : null,
        type: event.type,
        occurred_at: event.occurredAt,
        ip_hash: event.ipHash,
        user_agent: event.userAgent,
        metadata: event.metadata,
      };

      await collections.authEvents.insertOne(document);
    },
  };
}

async function findUserById(
  collection: Awaited<ReturnType<typeof getAuthCollections>>['users'],
  userId: string
): Promise<Auth.User | null> {
  const document = await collection.findOne({
    _id: parseObjectId(userId),
  });

  return document ? mapUserDocument(document) : null;
}

function buildUserUpdate(input: UpdateAuthUserInput): Partial<UserDocument> {
  const update: Partial<UserDocument> = {};

  if (input.emailVerifiedAt !== undefined) {
    update.email_verified_at = input.emailVerifiedAt;
  }

  if (input.lastLoginAt !== undefined) {
    update.last_login_at = input.lastLoginAt;
  }

  if (input.passwordHash !== undefined) {
    update.password_hash = input.passwordHash;
  }

  if (input.status !== undefined) {
    update.status = input.status;
  }

  if (input.updatedAt !== undefined) {
    update.updated_at = input.updatedAt;
  }

  return update;
}

function buildSessionUpdate(
  input: Partial<Pick<Auth.Session, 'lastSeenAt' | 'expiresAt' | 'level' | 'recentAuthAt'>>
): Partial<SessionDocument> {
  const update: Partial<SessionDocument> = {};

  if (input.lastSeenAt !== undefined) {
    update.last_seen_at = input.lastSeenAt;
  }

  if (input.expiresAt !== undefined) {
    update.expires_at = input.expiresAt;
  }

  if (input.level !== undefined) {
    update.level = input.level;
  }

  if (input.recentAuthAt !== undefined) {
    update.recent_auth_at = input.recentAuthAt;
  }

  return update;
}

function mapUserDocument(document: WithId<UserDocument>): Auth.User {
  return {
    id: document._id.toHexString(),
    emailNormalized: document.email_normalized,
    emailDisplay: document.email_display,
    passwordHash: document.password_hash,
    emailVerifiedAt: document.email_verified_at,
    mfaEnrolledAt: document.mfa_enrolled_at,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    lastLoginAt: document.last_login_at,
    status: document.status,
  };
}

function mapSessionDocument(document: WithId<SessionDocument>): Auth.Session {
  return {
    id: document._id.toHexString(),
    userId: document.user_id.toHexString(),
    tokenHash: document.token_hash,
    createdAt: document.created_at,
    lastSeenAt: document.last_seen_at,
    expiresAt: document.expires_at,
    ipHash: document.ip_hash,
    userAgent: document.user_agent,
    level: document.level,
    recentAuthAt: document.recent_auth_at,
  };
}

function mapIssuedTokenDocument(
  kind: Auth.TokenKind,
  document: WithId<VerificationTokenDocument> | WithId<PasswordResetTokenDocument>
): Auth.IssuedToken {
  return {
    id: document._id.toHexString(),
    userId: document.user_id.toHexString(),
    tokenHash: document.token_hash,
    kind,
    createdAt: document.created_at,
    expiresAt: document.expires_at,
    usedAt: document.used_at,
  };
}

function parseObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId value: ${value}`);
  }

  return new ObjectId(value);
}

function getTokenCollection(
  collections: Awaited<ReturnType<typeof getAuthCollections>>,
  kind: Auth.TokenKind
) {
  return kind === 'email_verification'
    ? collections.emailVerificationTokens
    : collections.passwordResetTokens;
}

function withInsertedId<T>(
  document: T,
  result: InsertOneResult
): WithId<T> {
  return {
    ...document,
    _id: result.insertedId,
  } as WithId<T>;
}

function handleDuplicateKey(error: unknown, message: string): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    throw new Error(message);
  }

  throw error;
}
