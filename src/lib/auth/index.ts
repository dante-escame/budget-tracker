export { authConfig } from '@/lib/auth/config';
export {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from '@/lib/auth/cookies';
export { normalizeEmail, toDisplayEmail } from '@/lib/auth/email';
export { getAuthCollections } from '@/lib/auth/mongodb-collections';
export { createMongoAuthRepository } from '@/lib/auth/mongodb-repository';
export {
  redirectIfAuthenticated,
  requireAuthenticatedSession,
  requireAuthenticatedUser,
  requireVerifiedAuthenticatedUser,
} from '@/lib/auth/guards';
export {
  badRequest,
  conflict,
  extractRequestContext,
  maybeExposeToken,
  parseBodyWithSchema,
  serializeSession,
  serializeUser,
  unauthorized,
} from '@/lib/auth/http';
export { getPasswordPolicy } from '@/lib/auth/settings';
export { getAuthService } from '@/lib/auth/runtime';
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
export type { Auth } from '@/lib/auth/types';
