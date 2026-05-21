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
import type { Auth } from '@/lib/auth/types';

export interface CreateUserInput {
  email: string;
  password: string;
  context?: Auth.LoginContext;
}

export interface PasswordLoginInput {
  email: string;
  password: string;
  context?: Auth.LoginContext;
}

export interface IssueTokenResult {
  token: string;
  record: Auth.IssuedToken;
}

export interface AuthenticatedSession {
  user: Auth.User;
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
  async function createUser(input: CreateUserInput): Promise<Auth.User> {
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

  async function verifyPasswordLogin(input: PasswordLoginInput): Promise<Auth.User> {
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
    user: Auth.User,
    context?: Auth.LoginContext
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

  async function validateRequestSession(): Promise<Auth.SessionValidationResult> {
    const token = await getSessionCookie();

    if (!token) {
      return { session: null, user: null, shouldRefresh: false };
    }

    const tokenHash = hashOpaqueToken(token);
    const session = await repository.findSessionByTokenHash(tokenHash);

    if (!session || isSessionExpired(session)) {
      await clearSessionCookie();

      if (session) {
        await repository.deleteSession(session.id);
      }

      return { session: null, user: null, shouldRefresh: false };
    }

    const user = await repository.findUserById(session.userId);

    if (!user || user.status === 'locked') {
      await repository.deleteSession(session.id);
      await clearSessionCookie();

      return { session: null, user: null, shouldRefresh: false };
    }

    if (shouldRefreshSession(session)) {
      const refreshedSession = await repository.updateSession(session.id, {
        expiresAt: extendSessionExpiry(),
        lastSeenAt: new Date(),
      });

      await setSessionCookie(token, refreshedSession.expiresAt);

      return { session: refreshedSession, user, shouldRefresh: true };
    }

    return { session, user, shouldRefresh: false };
  }

  async function peekRequestSession(): Promise<Auth.SessionValidationResult> {
    const token = await getSessionCookie();

    if (!token) {
      return { session: null, user: null, shouldRefresh: false };
    }

    const tokenHash = hashOpaqueToken(token);
    const session = await repository.findSessionByTokenHash(tokenHash);

    if (!session || isSessionExpired(session)) {
      if (session) {
        await repository.deleteSession(session.id);
      }

      return { session: null, user: null, shouldRefresh: false };
    }

    const user = await repository.findUserById(session.userId);

    if (!user || user.status === 'locked') {
      await repository.deleteSession(session.id);

      return { session: null, user: null, shouldRefresh: false };
    }

    return { session, user, shouldRefresh: shouldRefreshSession(session) };
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
    kind: Auth.TokenKind
  ): Promise<IssueTokenResult> {
    await repository.deleteIssuedTokensByUserIdAndKind(userId, kind);

    const { token, tokenHash } = createUserTokenMaterial();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + getIssuedTokenTtlSeconds(kind, authConfig) * 1000
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
    kind: Auth.TokenKind,
    token: string
  ): Promise<Auth.IssuedToken | null> {
    const tokenHash = hashOpaqueToken(token);
    const record = await repository.findIssuedTokenByHash(kind, tokenHash);

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    await repository.markIssuedTokenUsed(record.id, new Date());

    return record;
  }

  async function verifyEmailAddress(
    token: string,
    context?: Auth.LoginContext
  ): Promise<Auth.User | null> {
    const record = await consumeToken('email_verification', token);

    if (!record) {
      return null;
    }

    const user = await repository.findUserById(record.userId);

    if (!user) {
      return null;
    }

    const verifiedAt = new Date();
    const updatedUser = await repository.updateUser(user.id, {
      emailVerifiedAt: verifiedAt,
      status: 'active',
      updatedAt: verifiedAt,
    });

    await repository.createAuthEvent({
      userId: user.id,
      type: 'auth.email.verified',
      occurredAt: verifiedAt,
      ipHash: context?.ipAddress ? hashIpAddress(context.ipAddress) : null,
      userAgent: context?.userAgent?.slice(0, 512) ?? null,
    });

    return updatedUser;
  }

  async function requestPasswordReset(
    email: string,
    context?: Auth.LoginContext
  ): Promise<IssueTokenResult | null> {
    const emailNormalized = normalizeEmail(email);
    const user = await repository.findUserByEmailNormalized(emailNormalized);

    if (!user || user.status === 'locked') {
      return null;
    }

    const tokenResult = await issueToken(user.id, 'password_reset');

    await repository.createAuthEvent({
      userId: user.id,
      type: 'auth.password_reset.requested',
      occurredAt: new Date(),
      ipHash: context?.ipAddress ? hashIpAddress(context.ipAddress) : null,
      userAgent: context?.userAgent?.slice(0, 512) ?? null,
    });

    return tokenResult;
  }

  async function resetPassword(
    token: string,
    newPassword: string,
    context?: Auth.LoginContext
  ): Promise<Auth.User | null> {
    const record = await consumeToken('password_reset', token);

    if (!record) {
      return null;
    }

    const user = await repository.findUserById(record.userId);

    if (!user) {
      return null;
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedAt = new Date();
    const updatedUser = await repository.updateUser(user.id, {
      passwordHash,
      updatedAt,
    });

    await repository.deleteSessionsByUserId(user.id);
    await clearSessionCookie();

    await repository.createAuthEvent({
      userId: user.id,
      type: 'auth.password_reset.completed',
      occurredAt: updatedAt,
      ipHash: context?.ipAddress ? hashIpAddress(context.ipAddress) : null,
      userAgent: context?.userAgent?.slice(0, 512) ?? null,
    });

    return updatedUser;
  }

  async function requireUser(): Promise<NonNullable<Auth.SessionValidationResult['user']>> {
    const result = await validateRequestSession();

    if (!result.user) {
      throw new AuthenticationRequiredError();
    }

    return result.user;
  }

  async function requireVerifiedUser(): Promise<
    NonNullable<Auth.SessionValidationResult['user']>
  > {
    const result = await validateRequestSession();

    if (!result.user) {
      throw new AuthenticationRequiredError();
    }

    if (!result.user.emailVerifiedAt) {
      throw new EmailNotVerifiedError();
    }

    return result.user;
  }

  async function requireRecentAuth(): Promise<Auth.SessionValidationResult> {
    const result = await validateRequestSession();

    if (!result.user || !result.session) {
      throw new AuthenticationRequiredError();
    }

    if (!hasRecentAuth(result.session)) {
      throw new RecentAuthenticationRequiredError();
    }

    return result;
  }

  async function getStepUpRequirementForSensitiveAction(): Promise<Auth.StepUpRequirement> {
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
    peekRequestSession,
    requestPasswordReset,
    requireRecentAuth,
    requireUser,
    requireVerifiedUser,
    resetPassword,
    validateRequestSession,
    verifyEmailAddress,
    verifyPasswordLogin,
  };
}

function getIssuedTokenTtlSeconds(
  kind: Auth.TokenKind,
  config: typeof authConfig
): number {
  if (kind === 'email_verification') {
    return config.emailVerificationTtlSeconds;
  }

  return config.passwordResetTtlSeconds;
}
