import { NextResponse } from 'next/server';

import {
  badRequest,
  extractRequestContext,
  parseBodyWithSchema,
  serializeUser,
} from '@/lib/auth/http';
import { resetPasswordSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';

export async function POST(request: Request) {
  const parsed = await parseBodyWithSchema(request, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;
  const { token, password } = parsed.data;

  const authService = await getAuthService();
  const user = await authService.resetPassword(
    token,
    password,
    extractRequestContext(request)
  );

  if (!user) {
    return badRequest('Reset token is invalid or expired.');
  }

  return NextResponse.json({ success: true, user: serializeUser(user) });
}
