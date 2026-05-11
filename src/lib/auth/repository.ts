import type {
  AuthEvent,
  AuthIssuedToken,
  AuthSession,
  AuthTokenKind,
  AuthUser,
} from '@/lib/auth/types';

export interface CreateAuthUserInput {
  emailNormalized: string;
  emailDisplay: string;
  passwordHash: string;
  status: AuthUser['status'];
}

export interface UpdateAuthUserInput {
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  passwordHash?: string;
  status?: AuthUser['status'];
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
  level: AuthSession['level'];
  recentAuthAt: Date | null;
}

export interface CreateIssuedTokenInput {
  userId: string;
  tokenHash: string;
  kind: AuthTokenKind;
  createdAt: Date;
  expiresAt: Date;
}

export interface AuthRepository {
  findUserById(userId: string): Promise<AuthUser | null>;
  findUserByEmailNormalized(emailNormalized: string): Promise<AuthUser | null>;
  createUser(input: CreateAuthUserInput): Promise<AuthUser>;
  updateUser(userId: string, input: UpdateAuthUserInput): Promise<AuthUser>;

  createSession(input: CreateAuthSessionInput): Promise<AuthSession>;
  findSessionByTokenHash(tokenHash: string): Promise<AuthSession | null>;
  updateSession(
    sessionId: string,
    input: Partial<Pick<AuthSession, 'lastSeenAt' | 'expiresAt' | 'level' | 'recentAuthAt'>>
  ): Promise<AuthSession>;
  deleteSession(sessionId: string): Promise<void>;
  deleteSessionsByUserId(userId: string): Promise<number>;

  createIssuedToken(input: CreateIssuedTokenInput): Promise<AuthIssuedToken>;
  findIssuedTokenByHash(
    kind: AuthTokenKind,
    tokenHash: string
  ): Promise<AuthIssuedToken | null>;
  markIssuedTokenUsed(tokenId: string, usedAt: Date): Promise<void>;
  deleteIssuedTokensByUserIdAndKind(
    userId: string,
    kind: AuthTokenKind
  ): Promise<number>;

  createAuthEvent(event: AuthEvent): Promise<void>;
}
