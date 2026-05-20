import 'server-only';

import { redirect } from 'next/navigation';

import { getAuthService } from '@/lib/auth/runtime';
import type { AuthSession, AuthUser } from '@/lib/auth/types';

export async function requireAuthenticatedUser(
  redirectTo = '/'
): Promise<AuthUser> {
  const authService = await getAuthService();
  const result = await authService.peekRequestSession();

  if (!result.user) {
    redirect(redirectTo);
  }

  return result.user;
}

export async function requireVerifiedAuthenticatedUser(
  unauthenticatedRedirectTo = '/',
  unverifiedRedirectTo = '/verify-email'
): Promise<AuthUser> {
  const authService = await getAuthService();
  const result = await authService.peekRequestSession();

  if (!result.user) {
    redirect(unauthenticatedRedirectTo);
  }

  if (!result.user.emailVerifiedAt) {
    redirect(unverifiedRedirectTo);
  }

  return result.user;
}

export async function requireAuthenticatedSession(
  redirectTo = '/'
): Promise<{ session: AuthSession; user: AuthUser }> {
  const authService = await getAuthService();
  const result = await authService.peekRequestSession();

  if (!result.user || !result.session) {
    redirect(redirectTo);
  }

  return {
    session: result.session,
    user: result.user,
  };
}

export async function redirectIfAuthenticated(redirectTo = '/dashboard'): Promise<void> {
  const authService = await getAuthService();
  const result = await authService.peekRequestSession();

  if (result.user) {
    redirect(redirectTo);
  }
}
