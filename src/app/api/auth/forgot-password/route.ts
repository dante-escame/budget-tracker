import { NextResponse } from 'next/server';

import { extractRequestContext, parseBodyWithSchema } from '@/lib/auth/http';
import { forgotPasswordSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  const parsed = await parseBodyWithSchema(request, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.data;

  const authService = await getAuthService();
  const tokenResult = await authService.requestPasswordReset(
    email,
    extractRequestContext(request)
  );

  if (tokenResult) {
    await sendPasswordResetEmail(email, tokenResult.token);
  }

  return NextResponse.json({ success: true });
}
