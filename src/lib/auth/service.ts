import 'server-only';

import {
  clearMfaChallengeCookie,
  clearSessionCookie,
  getMfaChallengeCookie,
  getSessionCookie,
  setMfaChallengeCookie,
  setSessionCookie,
} from '@/lib/auth/cookies';
import { authConfig } from '@/lib/auth/config';
import { normalizeEmail, toDisplayEmail } from '@/lib/auth/email';
import { decryptSecret, encryptSecret } from '@/lib/auth/mfa-crypto';
import {
  generateBackupCodes,
  generateNumericOtp,
  normalizeBackupCode,
} from '@/lib/auth/mfa-codes';
import { buildOtpAuthUri, generateTotpSecret, verifyTotp } from '@/lib/auth/totp';
import { sendMfaCodeEmail } from '@/lib/mailer';
import type { AuthRepository } from '@/lib/auth/repository';
import { hashPassword, verifyPasswordHash } from '@/lib/auth/password';
import {
  buildSessionRecord,
  extendSessionExpiry,
  hasRecentAuth,
  isSessionExpired,
  shouldRefreshSession,
} from '@/lib/auth/session';
import {
  createUserTokenMaterial,
  hashIpAddress,
  hashOpaqueToken,
} from '@/lib/auth/tokens';
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

export class MfaMethodAlreadyActiveError extends Error {
  constructor() {
    super('That authentication method is already active.');
  }
}

export class MfaMethodNotFoundError extends Error {
  constructor() {
    super('That authentication method is not set up.');
  }
}

export class InvalidMfaCodeError extends Error {
  constructor() {
    super('The verification code is incorrect or has expired.');
  }
}

export class MfaChallengeNotFoundError extends Error {
  constructor() {
    super('Your verification session has expired. Please sign in again.');
  }
}

export class MfaResendCooldownError extends Error {
  constructor() {
    super('Please wait before requesting another code.');
  }
}

export interface MfaEnrollmentStart {
  type: Auth.MfaMethodType;
  secret?: string;
  otpauthUri?: string;
}

export interface MfaEnrollmentResult {
  backupCodes: string[];
}

export interface MfaLoginChallengeResult {
  methodType: Auth.MfaMethodType;
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
    context?: Auth.LoginContext,
    options?: { level?: Auth.SessionLevel }
  ): Promise<AuthenticatedSession> {
    const sessionDraft = buildSessionRecord({
      userId: user.id,
      context,
      level: options?.level,
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

  async function recordMfaEvent(
    type: string,
    userId: string,
    context?: Auth.LoginContext,
    metadata?: Auth.Event['metadata']
  ): Promise<void> {
    await repository.createAuthEvent({
      userId,
      type,
      occurredAt: new Date(),
      ipHash: context?.ipAddress ? hashIpAddress(context.ipAddress) : null,
      userAgent: context?.userAgent?.slice(0, 512) ?? null,
      metadata,
    });
  }

  async function replaceBackupCodes(userId: string): Promise<string[]> {
    await repository.deleteBackupCodesByUserId(userId);
    const codes = generateBackupCodes(authConfig.mfaBackupCodeCount);
    await repository.createBackupCodes(
      userId,
      codes.map((code) => hashOpaqueToken(code))
    );

    return codes;
  }

  async function issueEmailCode(
    userId: string,
    email: string,
    purpose: Auth.MfaChallengePurpose
  ): Promise<void> {
    await repository.deleteMfaChallengesByUserAndPurpose(userId, purpose);

    const code = generateNumericOtp();
    const now = new Date();
    const { tokenHash } = createUserTokenMaterial();

    await repository.createMfaChallenge({
      userId,
      methodType: 'email',
      purpose,
      challengeHash: tokenHash,
      codeHash: hashOpaqueToken(code),
      createdAt: now,
      expiresAt: new Date(now.getTime() + authConfig.mfaEmailCodeTtlSeconds * 1000),
    });

    await sendMfaCodeEmail(email, code);
  }

  async function userHasActiveMfa(userId: string): Promise<boolean> {
    return (await repository.countActiveMfaMethods(userId)) > 0;
  }

  async function listMfaMethods(userId: string): Promise<Auth.MfaMethod[]> {
    return repository.listMfaMethods(userId);
  }

  async function startTotpEnrollment(
    userId: string,
    accountLabel: string,
    context?: Auth.LoginContext
  ): Promise<MfaEnrollmentStart> {
    const existing = await repository.findMfaMethod(userId, 'totp');

    if (existing?.status === 'active') {
      throw new MfaMethodAlreadyActiveError();
    }

    const secret = generateTotpSecret();
    const secretEncrypted = encryptSecret(secret);

    if (existing) {
      await repository.updateMfaMethod(userId, 'totp', {
        status: 'pending',
        secretEncrypted,
        verifiedAt: null,
      });
    } else {
      await repository.createMfaMethod({
        userId,
        type: 'totp',
        status: 'pending',
        secretEncrypted,
      });
    }

    await recordMfaEvent('auth.mfa.enrollment.started', userId, context, {
      method: 'totp',
    });

    return {
      type: 'totp',
      secret,
      otpauthUri: buildOtpAuthUri(secret, accountLabel),
    };
  }

  async function startEmailEnrollment(
    userId: string,
    email: string,
    context?: Auth.LoginContext
  ): Promise<MfaEnrollmentStart> {
    const existing = await repository.findMfaMethod(userId, 'email');

    if (existing?.status === 'active') {
      throw new MfaMethodAlreadyActiveError();
    }

    if (existing) {
      await repository.updateMfaMethod(userId, 'email', {
        status: 'pending',
        verifiedAt: null,
      });
    } else {
      await repository.createMfaMethod({
        userId,
        type: 'email',
        status: 'pending',
        secretEncrypted: null,
      });
    }

    await issueEmailCode(userId, email, 'enrollment');

    await recordMfaEvent('auth.mfa.enrollment.started', userId, context, {
      method: 'email',
    });

    return { type: 'email' };
  }

  async function confirmEnrollment(
    userId: string,
    type: Auth.MfaMethodType,
    code: string,
    context?: Auth.LoginContext
  ): Promise<MfaEnrollmentResult> {
    const method = await repository.findMfaMethod(userId, type);

    if (!method) {
      throw new MfaMethodNotFoundError();
    }

    if (method.status === 'active') {
      throw new MfaMethodAlreadyActiveError();
    }

    if (type === 'totp') {
      const secretEncrypted = await repository.findMfaMethodSecret(userId, 'totp');

      if (!secretEncrypted || !verifyTotp(decryptSecret(secretEncrypted), code)) {
        throw new InvalidMfaCodeError();
      }
    } else {
      const record = await repository.findLatestMfaChallenge(userId, 'email', 'enrollment');
      await verifyEmailChallengeOrThrow(record, code);
      await repository.consumeMfaChallenge(record!.challenge.id, new Date());
    }

    const now = new Date();
    await repository.updateMfaMethod(userId, type, {
      status: 'active',
      verifiedAt: now,
    });

    const user = await repository.findUserById(userId);
    const isFirstMethod = !user?.mfaEnrolledAt;

    if (isFirstMethod) {
      await repository.updateUser(userId, { mfaEnrolledAt: now, updatedAt: now });
    }

    await recordMfaEvent('auth.mfa.enrolled', userId, context, { method: type });

    if (isFirstMethod) {
      return { backupCodes: await replaceBackupCodes(userId) };
    }

    return { backupCodes: [] };
  }

  async function disableMfaMethod(
    userId: string,
    type: Auth.MfaMethodType,
    context?: Auth.LoginContext
  ): Promise<void> {
    const method = await repository.findMfaMethod(userId, type);

    if (!method) {
      throw new MfaMethodNotFoundError();
    }

    await repository.deleteMfaMethod(userId, type);
    await repository.deleteMfaChallengesByUserAndPurpose(userId, 'enrollment');

    const remaining = await repository.countActiveMfaMethods(userId);

    if (remaining === 0) {
      const now = new Date();
      await repository.updateUser(userId, { mfaEnrolledAt: null, updatedAt: now });
      await repository.deleteBackupCodesByUserId(userId);
    }

    await recordMfaEvent('auth.mfa.disabled', userId, context, { method: type });
  }

  async function regenerateBackupCodes(
    userId: string,
    context?: Auth.LoginContext
  ): Promise<string[]> {
    if ((await repository.countActiveMfaMethods(userId)) === 0) {
      throw new MfaMethodNotFoundError();
    }

    const codes = await replaceBackupCodes(userId);
    await recordMfaEvent('auth.mfa.backup_codes.regenerated', userId, context);

    return codes;
  }

  async function beginLoginChallenge(
    user: Auth.User,
    context?: Auth.LoginContext
  ): Promise<MfaLoginChallengeResult> {
    const methods = await repository.listMfaMethods(user.id);
    const active = methods.filter((method) => method.status === 'active');
    // Prefer the authenticator app; fall back to email when it is the only one.
    const chosen =
      active.find((method) => method.type === 'totp') ??
      active.find((method) => method.type === 'email');

    if (!chosen) {
      throw new MfaMethodNotFoundError();
    }

    await repository.deleteMfaChallengesByUserAndPurpose(user.id, 'login');

    const { token, tokenHash } = createUserTokenMaterial();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + authConfig.mfaChallengeTtlSeconds * 1000);

    let codeHash: string | null = null;
    let emailCode: string | null = null;

    if (chosen.type === 'email') {
      emailCode = generateNumericOtp();
      codeHash = hashOpaqueToken(emailCode);
    }

    await repository.createMfaChallenge({
      userId: user.id,
      methodType: chosen.type,
      purpose: 'login',
      challengeHash: tokenHash,
      codeHash,
      createdAt: now,
      expiresAt,
    });

    await setMfaChallengeCookie(token, expiresAt);

    if (chosen.type === 'email' && emailCode) {
      await sendMfaCodeEmail(user.emailDisplay, emailCode);
    }

    await recordMfaEvent('auth.mfa.login.challenged', user.id, context, {
      method: chosen.type,
    });

    return { methodType: chosen.type };
  }

  async function resendLoginChallenge(
    context?: Auth.LoginContext
  ): Promise<MfaLoginChallengeResult> {
    const token = await getMfaChallengeCookie();

    if (!token) {
      throw new MfaChallengeNotFoundError();
    }

    const record = await repository.findMfaChallengeByHash(hashOpaqueToken(token));

    if (
      !record ||
      record.challenge.purpose !== 'login' ||
      record.challenge.consumedAt ||
      record.challenge.expiresAt.getTime() <= Date.now()
    ) {
      await clearMfaChallengeCookie();
      throw new MfaChallengeNotFoundError();
    }

    if (record.challenge.methodType !== 'email') {
      // Authenticator codes are generated on the device; nothing to resend.
      return { methodType: record.challenge.methodType };
    }

    // Throttle resends so a stolen challenge cookie can't be used to spam OTP
    // emails: a fresh code is only re-issued once the cooldown since the current
    // challenge was created has elapsed.
    const cooldownMs = authConfig.mfaResendCooldownSeconds * 1000;
    if (Date.now() - record.challenge.createdAt.getTime() < cooldownMs) {
      throw new MfaResendCooldownError();
    }

    const user = await repository.findUserById(record.challenge.userId);

    if (!user) {
      throw new MfaChallengeNotFoundError();
    }

    return beginLoginChallenge(user, context);
  }

  async function completeLoginChallenge(
    code: string,
    context?: Auth.LoginContext
  ): Promise<AuthenticatedSession> {
    const token = await getMfaChallengeCookie();

    if (!token) {
      throw new MfaChallengeNotFoundError();
    }

    const record = await repository.findMfaChallengeByHash(hashOpaqueToken(token));

    if (
      !record ||
      record.challenge.purpose !== 'login' ||
      record.challenge.consumedAt ||
      record.challenge.expiresAt.getTime() <= Date.now()
    ) {
      await clearMfaChallengeCookie();
      throw new MfaChallengeNotFoundError();
    }

    const { challenge } = record;

    if (challenge.attempts >= authConfig.mfaMaxAttempts) {
      await repository.consumeMfaChallenge(challenge.id, new Date());
      await clearMfaChallengeCookie();
      throw new MfaChallengeNotFoundError();
    }

    const user = await repository.findUserById(challenge.userId);

    if (!user) {
      await clearMfaChallengeCookie();
      throw new MfaChallengeNotFoundError();
    }

    const verification = await verifyLoginCode(user, challenge, record.codeHash, code);

    if (!verification.ok) {
      const updated = await repository.incrementMfaChallengeAttempts(challenge.id);

      if (updated.attempts >= authConfig.mfaMaxAttempts) {
        await repository.consumeMfaChallenge(challenge.id, new Date());
      }

      throw new InvalidMfaCodeError();
    }

    const now = new Date();
    await repository.consumeMfaChallenge(challenge.id, now);
    await clearMfaChallengeCookie();

    if (verification.usedBackupCode) {
      await recordMfaEvent('auth.mfa.backup_code.used', user.id, context);
    } else {
      await repository.updateMfaMethod(user.id, challenge.methodType, {
        lastUsedAt: now,
      });
    }

    await recordMfaEvent('auth.mfa.login.succeeded', user.id, context, {
      method: verification.usedBackupCode ? 'backup_code' : challenge.methodType,
    });

    return createSession(user, context, { level: 'step_up' });
  }

  async function verifyEmailChallengeOrThrow(
    record: Awaited<ReturnType<AuthRepository['findLatestMfaChallenge']>>,
    code: string
  ): Promise<void> {
    if (
      !record ||
      record.challenge.consumedAt ||
      record.challenge.expiresAt.getTime() <= Date.now() ||
      record.challenge.attempts >= authConfig.mfaMaxAttempts
    ) {
      throw new InvalidMfaCodeError();
    }

    const matches =
      record.codeHash !== null && record.codeHash === hashOpaqueToken(code.trim());

    if (!matches) {
      await repository.incrementMfaChallengeAttempts(record.challenge.id);
      throw new InvalidMfaCodeError();
    }
  }

  async function verifyLoginCode(
    user: Auth.User,
    challenge: Auth.MfaChallenge,
    codeHash: string | null,
    code: string
  ): Promise<{ ok: boolean; usedBackupCode: boolean }> {
    if (challenge.methodType === 'totp') {
      const secretEncrypted = await repository.findMfaMethodSecret(user.id, 'totp');

      if (secretEncrypted && verifyTotp(decryptSecret(secretEncrypted), code)) {
        return { ok: true, usedBackupCode: false };
      }
    } else if (codeHash !== null && codeHash === hashOpaqueToken(code.trim())) {
      return { ok: true, usedBackupCode: false };
    }

    // Backup codes work as a fallback regardless of the challenge method.
    const backup = await repository.findBackupCodeByHash(
      user.id,
      hashOpaqueToken(normalizeBackupCode(code))
    );

    if (backup && !backup.usedAt) {
      await repository.markBackupCodeUsed(backup.id, new Date());

      return { ok: true, usedBackupCode: true };
    }

    return { ok: false, usedBackupCode: false };
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
    beginLoginChallenge,
    completeLoginChallenge,
    confirmEnrollment,
    consumeToken,
    createSession,
    createUser,
    disableMfaMethod,
    getStepUpRequirementForSensitiveAction,
    invalidateAllUserSessions,
    invalidateSession,
    issueToken,
    listMfaMethods,
    peekRequestSession,
    regenerateBackupCodes,
    requestPasswordReset,
    requireRecentAuth,
    requireUser,
    requireVerifiedUser,
    resendLoginChallenge,
    resetPassword,
    startEmailEnrollment,
    startTotpEnrollment,
    userHasActiveMfa,
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
