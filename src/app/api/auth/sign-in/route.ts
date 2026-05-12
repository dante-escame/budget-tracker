import { NextResponse } from 'next/server';

import {
  badRequest,
  extractRequestContext,
  parseAuthRouteBody,
  serializeUser,
  unauthorized,
} from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import {
  AuthenticationRequiredError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '@/lib/auth/service';

export async function POST(request: Request) {
  const body = await parseAuthRouteBody(request);

  if (!body.email || !body.password) {
    return badRequest('Email and password are required.');
  }

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const user = await authService.verifyPasswordLogin({
      email: body.email,
      password: body.password,
      context,
    });
    const authenticatedSession = await authService.createSession(user, context);

    return NextResponse.json({
      user: serializeUser(authenticatedSession.user),
      session: {
        id: authenticatedSession.sessionId,
        expiresAt: authenticatedSession.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (
      error instanceof InvalidCredentialsError ||
      error instanceof AuthenticationRequiredError
    ) {
      return unauthorized('Invalid email or password.');
    }

    if (error instanceof EmailNotVerifiedError) {
      return unauthorized(error.message);
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    throw error;
  }
}
