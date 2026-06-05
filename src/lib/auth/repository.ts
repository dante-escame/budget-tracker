import type { Auth } from '@/lib/auth/types';

export interface CreateAuthUserInput {
  emailNormalized: string;
  emailDisplay: string;
  passwordHash: string;
  status: Auth.User['status'];
}

export interface UpdateAuthUserInput {
  emailVerifiedAt?: Date | null;
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

  createAuthEvent(event: Auth.Event): Promise<void>;
}
