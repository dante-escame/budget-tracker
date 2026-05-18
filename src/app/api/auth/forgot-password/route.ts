import { NextResponse } from 'next/server';

import {
  badRequest,
  extractRequestContext,
  parseAuthRouteBody,
} from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { sendPasswordResetEmail } from '@/lib/mailer';

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

  if (tokenResult) {
    await sendPasswordResetEmail(body.email, tokenResult.token);
  }

  return NextResponse.json({ success: true });
}
