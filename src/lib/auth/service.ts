import 'server-only';

import { clearSessionCookie, getSessionCookie, setSessionCookie } from '@/lib/auth/cookies';
import { authConfig } from '@/lib/auth/config';
import { normalizeEmail, toDisplayEmail } from '@/lib/auth/email';
import type { AuthRepository } from '@/lib/auth/repository';
import { hashPassword, verifyPasswordHash } from '@/lib/auth/password';
import {
  buildSessionRecord,
  extendSessionExpiry,
  hasRecentAuth,
  isSessionExpired,
  shouldRefreshSession,
} from '@/lib/auth/session';
import { createUserTokenMaterial, hashIpAddress, hashOpaqueToken } from '@/lib/auth/tokens';
import type {
  AuthIssuedToken,
  AuthTokenKind,
  AuthUser,
  LoginRequestContext,
  SessionValidationResult,
  StepUpRequirement,
} from '@/lib/auth/types';

export interface CreateUserInput {
  email: string;
  password: string;
  context?: LoginRequestContext;
}

export interface PasswordLoginInput {
  email: string;
  password: string;
  context?: LoginRequestContext;
}

export interface IssueTokenResult {
  token: string;
  record: AuthIssuedToken;
}

export interface AuthenticatedSession {
  user: AuthUser;
  sessionId: string;
  expiresAt: Date;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super('Email verification is required before access is granted.');
  }
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication is required.');
  }
}

export class RecentAuthenticationRequiredError extends Error {
  constructor() {
    super('A recent authentication check is required.');
  }
}

export class StepUpAuthenticationRequiredError extends Error {
  constructor() {
    super('Step-up authentication is required.');
  }
}

export function createAuthService(repository: AuthRepository) {
  async function createUser(input: CreateUserInput): Promise<AuthUser> {
      const emailNormalized = normalizeEmail(input.email);
      const emailDisplay = toDisplayEmail(input.email);
      const passwordHash = await hashPassword(input.password);
      const user = await repository.createUser({
        emailNormalized,
        emailDisplay,
        passwordHash,
        status: 'pending_verification',
      });

      await repository.createAuthEvent({
        userId: user.id,
        type: 'auth.user.created',
        occurredAt: new Date(),
        ipHash: input.context?.ipAddress ? hashIpAddress(input.context.ipAddress) : null,
        userAgent: input.context?.userAgent?.slice(0, 512) ?? null,
      });

      return user;
    }

    async function verifyPasswordLogin(input: PasswordLoginInput): Promise<AuthUser> {
      const emailNormalized = normalizeEmail(input.email);
      const user = await repository.findUserByEmailNormalized(emailNormalized);

      if (!user) {
        throw new InvalidCredentialsError();
      }

      const isValid = await verifyPasswordHash(user.passwordHash, input.password);

      if (!isValid) {
        throw new InvalidCredentialsError();
      }

      if (user.status === 'locked') {
        throw new AuthenticationRequiredError();
      }

      if (!user.emailVerifiedAt || user.status === 'pending_verification') {
        throw new EmailNotVerifiedError();
      }

      const updatedUser = await repository.updateUser(user.id, {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.createAuthEvent({
        userId: user.id,
        type: 'auth.login.succeeded',
        occurredAt: new Date(),
        ipHash: input.context?.ipAddress ? hashIpAddress(input.context.ipAddress) : null,
        userAgent: input.context?.userAgent?.slice(0, 512) ?? null,
      });

      return updatedUser;
    }

    async function createSession(
      user: AuthUser,
      context?: LoginRequestContext
    ): Promise<AuthenticatedSession> {
      const sessionDraft = buildSessionRecord({
        userId: user.id,
        context,
      });

      const session = await repository.createSession({
        userId: sessionDraft.userId,
        tokenHash: sessionDraft.tokenHash,
        createdAt: sessionDraft.createdAt,
        lastSeenAt: sessionDraft.lastSeenAt,
        expiresAt: sessionDraft.expiresAt,
        ipHash: sessionDraft.ipHash,
        userAgent: sessionDraft.userAgent,
        level: sessionDraft.level,
        recentAuthAt: sessionDraft.recentAuthAt,
      });

      await setSessionCookie(sessionDraft.token, session.expiresAt);

      return {
        user,
        sessionId: session.id,
        expiresAt: session.expiresAt,
      };
    }

    async function validateRequestSession(): Promise<SessionValidationResult> {
      const token = await getSessionCookie();

      if (!token) {
        return {
          session: null,
          user: null,
          shouldRefresh: false,
        };
      }

      const tokenHash = hashOpaqueToken(token);
      const session = await repository.findSessionByTokenHash(tokenHash);

      if (!session || isSessionExpired(session)) {
        await clearSessionCookie();

        if (session) {
          await repository.deleteSession(session.id);
        }

        return {
          session: null,
          user: null,
          shouldRefresh: false,
        };
      }

      const user = await repository.findUserById(session.userId);

      if (!user || user.status === 'locked') {
        await repository.deleteSession(session.id);
        await clearSessionCookie();

        return {
          session: null,
          user: null,
          shouldRefresh: false,
        };
      }

      const refreshNeeded = shouldRefreshSession(session);

      if (refreshNeeded) {
        const refreshedSession = await repository.updateSession(session.id, {
          expiresAt: extendSessionExpiry(),
          lastSeenAt: new Date(),
        });

        await setSessionCookie(token, refreshedSession.expiresAt);

        return {
          session: refreshedSession,
          user,
          shouldRefresh: true,
        };
      }

      return {
        session,
        user,
        shouldRefresh: false,
      };
    }

    async function invalidateSession(sessionId: string): Promise<void> {
      await repository.deleteSession(sessionId);
      await clearSessionCookie();
    }

    async function invalidateAllUserSessions(userId: string): Promise<number> {
      await clearSessionCookie();

      return repository.deleteSessionsByUserId(userId);
    }

    async function issueToken(
      userId: string,
      kind: AuthTokenKind
    ): Promise<IssueTokenResult> {
      await repository.deleteIssuedTokensByUserIdAndKind(userId, kind);

      const { token, tokenHash } = createUserTokenMaterial();
      const createdAt = new Date();
      const expiresAt = new Date(
        createdAt.getTime() +
          getIssuedTokenTtlSeconds(kind, authConfig) * 1000
      );
      const record = await repository.createIssuedToken({
        userId,
        tokenHash,
        kind,
        createdAt,
        expiresAt,
      });

      return { token, record };
    }

    async function consumeToken(
      kind: AuthTokenKind,
      token: string
    ): Promise<AuthIssuedToken | null> {
      const tokenHash = hashOpaqueToken(token);
      const record = await repository.findIssuedTokenByHash(kind, tokenHash);

      if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
        return null;
      }

      await repository.markIssuedTokenUsed(record.id, new Date());

      return record;
    }

    async function requireUser(): Promise<NonNullable<SessionValidationResult['user']>> {
      const result = await validateRequestSession();

      if (!result.user) {
        throw new AuthenticationRequiredError();
      }

      return result.user;
    }

    async function requireVerifiedUser(): Promise<NonNullable<SessionValidationResult['user']>> {
      const result = await validateRequestSession();

      if (!result.user) {
        throw new AuthenticationRequiredError();
      }

      if (!result.user.emailVerifiedAt) {
        throw new EmailNotVerifiedError();
      }

      return result.user;
    }

    async function requireRecentAuth(): Promise<SessionValidationResult> {
      const result = await validateRequestSession();

      if (!result.user || !result.session) {
        throw new AuthenticationRequiredError();
      }

      if (!hasRecentAuth(result.session)) {
        throw new RecentAuthenticationRequiredError();
      }

      return result;
    }

    async function getStepUpRequirementForSensitiveAction(): Promise<StepUpRequirement> {
      const result = await validateRequestSession();

      if (!result.user || !result.session) {
        return { required: true, reason: 'sensitive_action' };
      }

      if (result.session.level !== 'step_up') {
        return { required: true, reason: 'sensitive_action' };
      }

      if (!hasRecentAuth(result.session)) {
        return { required: true, reason: 'stale_auth' };
      }

      return { required: false, reason: 'none' };
    }

  return {
    consumeToken,
    createSession,
    createUser,
    getStepUpRequirementForSensitiveAction,
    invalidateAllUserSessions,
    invalidateSession,
    issueToken,
    requireRecentAuth,
    requireUser,
    requireVerifiedUser,
    validateRequestSession,
    verifyPasswordLogin,
  };
}

function getIssuedTokenTtlSeconds(
  kind: AuthTokenKind,
  config: typeof authConfig
): number {
  if (kind === 'email_verification') {
    return config.emailVerificationTtlSeconds;
  }

  return config.passwordResetTtlSeconds;
}
