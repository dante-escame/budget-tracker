import 'server-only';

import { NextResponse } from 'next/server';

import type { LoginRequestContext } from '@/lib/auth/types';

export interface AuthRouteBody {
  email?: string;
  password?: string;
  token?: string;
}

export function extractRequestContext(request: Request): LoginRequestContext {
  return {
    ipAddress: getIpAddress(request),
    userAgent: request.headers.get('user-agent'),
  };
}

export async function parseAuthRouteBody(
  request: Request
): Promise<AuthRouteBody> {
  const body = (await request.json()) as unknown;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Request body must be a JSON object.');
  }

  const bodyRecord = body as Record<string, unknown>;

  return {
    email: asOptionalString(bodyRecord.email),
    password: asOptionalString(bodyRecord.password),
    token: asOptionalString(bodyRecord.token),
  };
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serializeUser(user: {
  id: string;
  emailDisplay: string;
  emailNormalized: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  status: string;
}) {
  return {
    id: user.id,
    emailDisplay: user.emailDisplay,
    emailNormalized: user.emailNormalized,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    status: user.status,
  };
}

export function serializeSession(session: {
  id: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  level: string;
  recentAuthAt: Date | null;
}) {
  return {
    id: session.id,
    userId: session.userId,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    level: session.level,
    recentAuthAt: session.recentAuthAt?.toISOString() ?? null,
  };
}

export function maybeExposeToken(token: string) {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }

  return token;
}

function getIpAddress(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const [firstAddress] = forwardedFor.split(',');

    return firstAddress?.trim() ?? null;
  }

  return request.headers.get('x-real-ip');
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim();
}
