import 'server-only';

import { cookies } from 'next/headers';

import { authConfig } from '@/lib/auth/config';

export async function setSessionCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(authConfig.sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(authConfig.sessionCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(authConfig.sessionCookieName)?.value ?? null;
}

export async function setMfaChallengeCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(authConfig.mfaChallengeCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearMfaChallengeCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(authConfig.mfaChallengeCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getMfaChallengeCookie(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(authConfig.mfaChallengeCookieName)?.value ?? null;
}
