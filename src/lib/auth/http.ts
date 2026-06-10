import 'server-only';

import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

import type { Auth } from '@/lib/auth/types';

export function extractRequestContext(request: Request): Auth.LoginContext {
  return {
    ipAddress: getIpAddress(request),
    userAgent: request.headers.get('user-agent'),
  };
}

export async function parseBodyWithSchema<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest('Request body must be valid JSON.') };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid request body.';
    return { ok: false, response: badRequest(message) };
  }

  return { ok: true, data: result.data };
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
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
