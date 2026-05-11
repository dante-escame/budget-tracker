export type AuthUserStatus = 'active' | 'locked' | 'pending_verification';

export type AuthSessionLevel = 'base' | 'step_up';

export type AuthTokenKind = 'email_verification' | 'password_reset';

export interface AuthUser {
  id: string;
  emailNormalized: string;
  emailDisplay: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  mfaEnrolledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  status: AuthUserStatus;
}

export interface AuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  ipHash: string | null;
  userAgent: string | null;
  level: AuthSessionLevel;
  recentAuthAt: Date | null;
}

export interface AuthIssuedToken {
  id: string;
  userId: string;
  tokenHash: string;
  kind: AuthTokenKind;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface AuthEvent {
  userId?: string;
  type: string;
  occurredAt: Date;
  ipHash: string | null;
  userAgent: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface LoginRequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SessionValidationResult {
  session: AuthSession | null;
  user: AuthUser | null;
  shouldRefresh: boolean;
}

export interface StepUpRequirement {
  required: boolean;
  reason: 'none' | 'sensitive_action' | 'risk_event' | 'stale_auth';
}
