import type { Auth } from '@/lib/auth/types';

export interface CreateAuthUserInput {
  emailNormalized: string;
  emailDisplay: string;
  passwordHash: string;
  status: Auth.User['status'];
}

export interface UpdateAuthUserInput {
  emailVerifiedAt?: Date | null;
  mfaEnrolledAt?: Date | null;
  lastLoginAt?: Date | null;
  passwordHash?: string;
  status?: Auth.User['status'];
  updatedAt?: Date;
}

export interface CreateAuthSessionInput {
  userId: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  ipHash: string | null;
  userAgent: string | null;
  level: Auth.Session['level'];
  recentAuthAt: Date | null;
}

export interface CreateIssuedTokenInput {
  userId: string;
  tokenHash: string;
  kind: Auth.TokenKind;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateMfaMethodInput {
  userId: string;
  type: Auth.MfaMethodType;
  status: Auth.MfaMethodStatus;
  secretEncrypted: string | null;
}

export interface UpdateMfaMethodInput {
  status?: Auth.MfaMethodStatus;
  secretEncrypted?: string | null;
  verifiedAt?: Date | null;
  lastUsedAt?: Date | null;
}

export interface CreateMfaChallengeInput {
  userId: string;
  methodType: Auth.MfaMethodType;
  purpose: Auth.MfaChallengePurpose;
  challengeHash: string;
  codeHash: string | null;
  createdAt: Date;
  expiresAt: Date;
}

// Repository-layer view that carries the code hash the domain type omits.
export interface MfaChallengeRecord {
  challenge: Auth.MfaChallenge;
  codeHash: string | null;
}

export interface BackupCodeRecord {
  id: string;
  usedAt: Date | null;
}

export interface AuthRepository {
  findUserById(userId: string): Promise<Auth.User | null>;
  findUserByEmailNormalized(emailNormalized: string): Promise<Auth.User | null>;
  createUser(input: CreateAuthUserInput): Promise<Auth.User>;
  updateUser(userId: string, input: UpdateAuthUserInput): Promise<Auth.User>;

  createSession(input: CreateAuthSessionInput): Promise<Auth.Session>;
  findSessionByTokenHash(tokenHash: string): Promise<Auth.Session | null>;
  updateSession(
    sessionId: string,
    input: Partial<Pick<Auth.Session, 'lastSeenAt' | 'expiresAt' | 'level' | 'recentAuthAt'>>
  ): Promise<Auth.Session>;
  deleteSession(sessionId: string): Promise<void>;
  deleteSessionsByUserId(userId: string): Promise<number>;

  createIssuedToken(input: CreateIssuedTokenInput): Promise<Auth.IssuedToken>;
  findIssuedTokenByHash(
    kind: Auth.TokenKind,
    tokenHash: string
  ): Promise<Auth.IssuedToken | null>;
  markIssuedTokenUsed(tokenId: string, usedAt: Date): Promise<void>;
  deleteIssuedTokensByUserIdAndKind(
    userId: string,
    kind: Auth.TokenKind
  ): Promise<number>;

  createMfaMethod(input: CreateMfaMethodInput): Promise<Auth.MfaMethod>;
  findMfaMethod(
    userId: string,
    type: Auth.MfaMethodType
  ): Promise<Auth.MfaMethod | null>;
  findMfaMethodSecret(
    userId: string,
    type: Auth.MfaMethodType
  ): Promise<string | null>;
  listMfaMethods(userId: string): Promise<Auth.MfaMethod[]>;
  countActiveMfaMethods(userId: string): Promise<number>;
  updateMfaMethod(
    userId: string,
    type: Auth.MfaMethodType,
    input: UpdateMfaMethodInput
  ): Promise<Auth.MfaMethod>;
  deleteMfaMethod(userId: string, type: Auth.MfaMethodType): Promise<void>;

  createMfaChallenge(input: CreateMfaChallengeInput): Promise<Auth.MfaChallenge>;
  findMfaChallengeByHash(challengeHash: string): Promise<MfaChallengeRecord | null>;
  findLatestMfaChallenge(
    userId: string,
    methodType: Auth.MfaMethodType,
    purpose: Auth.MfaChallengePurpose
  ): Promise<MfaChallengeRecord | null>;
  incrementMfaChallengeAttempts(challengeId: string): Promise<Auth.MfaChallenge>;
  consumeMfaChallenge(challengeId: string, consumedAt: Date): Promise<void>;
  deleteMfaChallengesByUserAndPurpose(
    userId: string,
    purpose: Auth.MfaChallengePurpose
  ): Promise<number>;

  createBackupCodes(userId: string, codeHashes: string[]): Promise<void>;
  deleteBackupCodesByUserId(userId: string): Promise<number>;
  findBackupCodeByHash(
    userId: string,
    codeHash: string
  ): Promise<BackupCodeRecord | null>;
  markBackupCodeUsed(backupCodeId: string, usedAt: Date): Promise<void>;

  createAuthEvent(event: Auth.Event): Promise<void>;
}
