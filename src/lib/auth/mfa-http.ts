import 'server-only';

import { NextResponse } from 'next/server';

import { badRequest, conflict, notFound, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import {
  AuthenticationRequiredError,
  InvalidMfaCodeError,
  MfaChallengeNotFoundError,
  MfaMethodAlreadyActiveError,
  MfaMethodNotFoundError,
  RecentAuthenticationRequiredError,
} from '@/lib/auth/service';
import type { Auth } from '@/lib/auth/types';

/**
 * Resolve a recently-authenticated user for Settings → Security mutations.
 * Returns either the user or a ready-to-send error response.
 */
export async function requireRecentAuthUser(): Promise<
  { ok: true; user: Auth.User } | { ok: false; response: NextResponse }
> {
  const authService = await getAuthService();

  try {
    const result = await authService.requireRecentAuth();

    return { ok: true, user: result.user! };
  } catch (error) {
    if (error instanceof RecentAuthenticationRequiredError) {
      return {
        ok: false,
        response: unauthorized('Please sign in again to manage two-factor settings.'),
      };
    }

    if (error instanceof AuthenticationRequiredError) {
      return { ok: false, response: unauthorized('Authentication is required.') };
    }

    throw error;
  }
}

/**
 * Map MFA service errors to HTTP responses, or rethrow unknown errors.
 */
export function mfaErrorResponse(error: unknown): NextResponse {
  if (error instanceof MfaMethodAlreadyActiveError) {
    return conflict(error.message);
  }

  if (error instanceof MfaMethodNotFoundError) {
    return notFound(error.message);
  }

  if (error instanceof InvalidMfaCodeError) {
    return badRequest(error.message);
  }

  if (error instanceof MfaChallengeNotFoundError) {
    return unauthorized(error.message);
  }

  if (error instanceof Error) {
    return badRequest(error.message);
  }

  throw error;
}
