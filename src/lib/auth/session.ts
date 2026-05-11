import 'server-only';

import { authConfig } from '@/lib/auth/config';
import { createSessionTokenMaterial, hashIpAddress } from '@/lib/auth/tokens';
import type { AuthSession, AuthSessionLevel, LoginRequestContext } from '@/lib/auth/types';

export interface SessionRecordInput {
  userId: string;
  context?: LoginRequestContext;
  level?: AuthSessionLevel;
}

export interface SessionRecordDraft {
  userId: string;
  token: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  ipHash: string | null;
  userAgent: string | null;
  level: AuthSessionLevel;
  recentAuthAt: Date;
}

export function buildSessionRecord(input: SessionRecordInput): SessionRecordDraft {
  const now = new Date();
  const { token, tokenHash } = createSessionTokenMaterial();

  return {
    userId: input.userId,
    token,
    tokenHash,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + authConfig.sessionTtlSeconds * 1000),
    ipHash: input.context?.ipAddress ? hashIpAddress(input.context.ipAddress) : null,
    userAgent: input.context?.userAgent?.slice(0, 512) ?? null,
    level: input.level ?? 'base',
    recentAuthAt: now,
  };
}

export function isSessionExpired(session: AuthSession, now = new Date()): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}

export function shouldRefreshSession(session: AuthSession, now = new Date()): boolean {
  const refreshThreshold = now.getTime() + authConfig.sessionFreshWindowSeconds * 1000;

  return session.expiresAt.getTime() <= refreshThreshold;
}

export function extendSessionExpiry(now = new Date()): Date {
  return new Date(now.getTime() + authConfig.sessionTtlSeconds * 1000);
}

export function hasRecentAuth(session: AuthSession, now = new Date()): boolean {
  if (!session.recentAuthAt) {
    return false;
  }

  const ageInMs = now.getTime() - session.recentAuthAt.getTime();

  return ageInMs <= authConfig.sessionRecentAuthWindowSeconds * 1000;
}
