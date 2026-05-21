export namespace Auth {
  export type UserStatus = 'active' | 'locked' | 'pending_verification';

  export type SessionLevel = 'base' | 'step_up';

  export type TokenKind = 'email_verification' | 'password_reset';

  export interface User {
    id: string;
    emailNormalized: string;
    emailDisplay: string;
    passwordHash: string;
    emailVerifiedAt: Date | null;
    mfaEnrolledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    status: UserStatus;
  }

  export interface Session {
    id: string;
    userId: string;
    tokenHash: string;
    createdAt: Date;
    lastSeenAt: Date;
    expiresAt: Date;
    ipHash: string | null;
    userAgent: string | null;
    level: SessionLevel;
    recentAuthAt: Date | null;
  }

  export interface IssuedToken {
    id: string;
    userId: string;
    tokenHash: string;
    kind: TokenKind;
    createdAt: Date;
    expiresAt: Date;
    usedAt: Date | null;
  }

  export interface Event {
    userId?: string;
    type: string;
    occurredAt: Date;
    ipHash: string | null;
    userAgent: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  }

  export interface LoginContext {
    ipAddress?: string | null;
    userAgent?: string | null;
  }

  export interface SessionValidationResult {
    session: Session | null;
    user: User | null;
    shouldRefresh: boolean;
  }

  export interface StepUpRequirement {
    required: boolean;
    reason: 'none' | 'sensitive_action' | 'risk_event' | 'stale_auth';
  }
}
