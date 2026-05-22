import { NextResponse } from 'next/server';

import {
  badRequest,
  extractRequestContext,
  parseBodyWithSchema,
  serializeUser,
} from '@/lib/auth/http';
import { verifyEmailSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';

export async function POST(request: Request) {
  const parsed = await parseBodyWithSchema(request, verifyEmailSchema);
  if (!parsed.ok) return parsed.response;
  const { token } = parsed.data;

  const authService = await getAuthService();
  const user = await authService.verifyEmailAddress(token, extractRequestContext(request));

  if (!user) {
    return badRequest('Verification token is invalid or expired.');
  }

  return NextResponse.json({ user: serializeUser(user) });
}
