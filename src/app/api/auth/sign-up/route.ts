import { NextResponse } from 'next/server';

import {
  badRequest,
  conflict,
  extractRequestContext,
  maybeExposeToken,
  parseAuthRouteBody,
  serializeUser,
} from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';

export async function POST(request: Request) {
  const body = await parseAuthRouteBody(request);

  if (!body.email || !body.password) {
    return badRequest('Email and password are required.');
  }

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const user = await authService.createUser({
      email: body.email,
      password: body.password,
      context,
    });
    const verification = await authService.issueToken(
      user.id,
      'email_verification'
    );

    return NextResponse.json(
      {
        user: serializeUser(user),
        verificationToken: maybeExposeToken(verification.token),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return conflict(error.message);
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    throw error;
  }
}
