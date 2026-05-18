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

  if (!body.token || !body.password) {
    return badRequest('Reset token and password are required.');
  }

  const authService = await getAuthService();
  const user = await authService.resetPassword(
    body.token,
    body.password,
    extractRequestContext(request)
  );

  if (!user) {
    return badRequest('Reset token is invalid or expired.');
  }

  return NextResponse.json({
    success: true,
    user: serializeUser(user),
  });
}
