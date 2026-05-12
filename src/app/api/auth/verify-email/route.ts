import { NextResponse } from 'next/server';

import {
  badRequest,
  extractRequestContext,
  parseAuthRouteBody,
  serializeUser,
} from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';

export async function POST(request: Request) {
  const body = await parseAuthRouteBody(request);

  if (!body.token) {
    return badRequest('Verification token is required.');
  }

  const authService = await getAuthService();
  const user = await authService.verifyEmailAddress(
    body.token,
    extractRequestContext(request)
  );

  if (!user) {
    return badRequest('Verification token is invalid or expired.');
  }

  return NextResponse.json({
    user: serializeUser(user),
  });
}
