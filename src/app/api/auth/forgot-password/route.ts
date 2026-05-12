import { NextResponse } from 'next/server';

import {
  badRequest,
  extractRequestContext,
  maybeExposeToken,
  parseAuthRouteBody,
} from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';

export async function POST(request: Request) {
  const body = await parseAuthRouteBody(request);

  if (!body.email) {
    return badRequest('Email is required.');
  }

  const authService = await getAuthService();
  const tokenResult = await authService.requestPasswordReset(
    body.email,
    extractRequestContext(request)
  );

  return NextResponse.json({
    success: true,
    resetToken: tokenResult ? maybeExposeToken(tokenResult.token) : undefined,
  });
}
