export { authConfig } from '@/lib/auth/config';
export {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from '@/lib/auth/cookies';
export { normalizeEmail, toDisplayEmail } from '@/lib/auth/email';
export type {
  AuthRepository,
  CreateAuthSessionInput,
  CreateAuthUserInput,
  CreateIssuedTokenInput,
  UpdateAuthUserInput,
} from '@/lib/auth/repository';
export { hashPassword, verifyPasswordHash } from '@/lib/auth/password';
export {
  buildSessionRecord,
  extendSessionExpiry,
  hasRecentAuth,
  isSessionExpired,
  shouldRefreshSession,
} from '@/lib/auth/session';
export {
  AuthenticationRequiredError,
  createAuthService,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  RecentAuthenticationRequiredError,
  StepUpAuthenticationRequiredError,
} from '@/lib/auth/service';
export {
  createSessionTokenMaterial,
  createUserTokenMaterial,
  hashIpAddress,
  hashOpaqueToken,
} from '@/lib/auth/tokens';
export type {
  AuthEvent,
  AuthIssuedToken,
  AuthSession,
  AuthSessionLevel,
  AuthTokenKind,
  AuthUser,
  AuthUserStatus,
  LoginRequestContext,
  SessionValidationResult,
  StepUpRequirement,
} from '@/lib/auth/types';
