import 'server-only';

import type { Collection, Db } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import type {
  AuthEventDocument,
  AuthSettingDocument,
  MfaBackupCodeDocument,
  MfaChallengeDocument,
  MfaMethodDocument,
  PasswordResetTokenDocument,
  SessionDocument,
  UserDocument,
  VerificationTokenDocument,
} from '@/lib/auth/mongodb-documents';

export interface AuthCollections {
  users: Collection<UserDocument>;
  sessions: Collection<SessionDocument>;
  emailVerificationTokens: Collection<VerificationTokenDocument>;
  passwordResetTokens: Collection<PasswordResetTokenDocument>;
  authEvents: Collection<AuthEventDocument>;
  authSettings: Collection<AuthSettingDocument>;
  mfaMethods: Collection<MfaMethodDocument>;
  mfaChallenges: Collection<MfaChallengeDocument>;
  mfaBackupCodes: Collection<MfaBackupCodeDocument>;
}

declare global {
  var __authIndexesPromise__: Promise<void> | undefined;
}

export async function getAuthCollections(): Promise<AuthCollections> {
  const db = await getMongoDb();
  const collections = createAuthCollections(db);

  if (!globalThis.__authIndexesPromise__) {
    globalThis.__authIndexesPromise__ = ensureAuthIndexes(collections);
  }

  await globalThis.__authIndexesPromise__;

  return collections;
}

function createAuthCollections(db: Db): AuthCollections {
  return {
    users: db.collection<UserDocument>('users'),
    sessions: db.collection<SessionDocument>('sessions'),
    emailVerificationTokens:
      db.collection<VerificationTokenDocument>('email_verification_tokens'),
    passwordResetTokens:
      db.collection<PasswordResetTokenDocument>('password_reset_tokens'),
    authEvents: db.collection<AuthEventDocument>('auth_events'),
    authSettings: db.collection<AuthSettingDocument>('auth_settings'),
    mfaMethods: db.collection<MfaMethodDocument>('mfa_methods'),
    mfaChallenges: db.collection<MfaChallengeDocument>('mfa_challenges'),
    mfaBackupCodes: db.collection<MfaBackupCodeDocument>('mfa_backup_codes'),
  };
}

async function ensureAuthIndexes(collections: AuthCollections): Promise<void> {
  await Promise.all([
    collections.users.createIndexes([
      {
        key: { email_normalized: 1 },
        name: 'users_email_normalized_unique',
        unique: true,
      },
      {
        key: { status: 1, created_at: -1 },
        name: 'users_status_created_at',
      },
    ]),
    collections.sessions.createIndexes([
      {
        key: { token_hash: 1 },
        name: 'sessions_token_hash_unique',
        unique: true,
      },
      {
        key: { user_id: 1, expires_at: -1 },
        name: 'sessions_user_id_expires_at',
      },
      {
        key: { expires_at: 1 },
        name: 'sessions_expires_at_ttl',
        expireAfterSeconds: 0,
      },
    ]),
    collections.emailVerificationTokens.createIndexes([
      {
        key: { token_hash: 1 },
        name: 'email_verification_tokens_token_hash_unique',
        unique: true,
      },
      {
        key: { user_id: 1, created_at: -1 },
        name: 'email_verification_tokens_user_id_created_at',
      },
      {
        key: { expires_at: 1 },
        name: 'email_verification_tokens_expires_at_ttl',
        expireAfterSeconds: 0,
      },
    ]),
    collections.passwordResetTokens.createIndexes([
      {
        key: { token_hash: 1 },
        name: 'password_reset_tokens_token_hash_unique',
        unique: true,
      },
      {
        key: { user_id: 1, created_at: -1 },
        name: 'password_reset_tokens_user_id_created_at',
      },
      {
        key: { expires_at: 1 },
        name: 'password_reset_tokens_expires_at_ttl',
        expireAfterSeconds: 0,
      },
    ]),
    collections.authEvents.createIndexes([
      {
        key: { user_id: 1, occurred_at: -1 },
        name: 'auth_events_user_id_occurred_at',
      },
      {
        key: { type: 1, occurred_at: -1 },
        name: 'auth_events_type_occurred_at',
      },
    ]),
    collections.authSettings.createIndexes([
      {
        key: { field: 1, key: 1 },
        name: 'auth_settings_field_key_unique',
        unique: true,
      },
      {
        key: { field: 1, updated_at: -1 },
        name: 'auth_settings_field_updated_at',
      },
    ]),
    collections.mfaMethods.createIndexes([
      {
        key: { user_id: 1, type: 1 },
        name: 'mfa_methods_user_id_type_unique',
        unique: true,
      },
      {
        key: { user_id: 1, status: 1 },
        name: 'mfa_methods_user_id_status',
      },
    ]),
    collections.mfaChallenges.createIndexes([
      {
        key: { challenge_hash: 1 },
        name: 'mfa_challenges_challenge_hash_unique',
        unique: true,
      },
      {
        key: { user_id: 1, created_at: -1 },
        name: 'mfa_challenges_user_id_created_at',
      },
      {
        key: { expires_at: 1 },
        name: 'mfa_challenges_expires_at_ttl',
        expireAfterSeconds: 0,
      },
    ]),
    collections.mfaBackupCodes.createIndexes([
      {
        key: { user_id: 1 },
        name: 'mfa_backup_codes_user_id',
      },
      {
        key: { code_hash: 1 },
        name: 'mfa_backup_codes_code_hash',
      },
    ]),
  ]);
}
