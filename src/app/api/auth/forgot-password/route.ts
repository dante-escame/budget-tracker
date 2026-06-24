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
    // A delivery failure (e.g. missing RESEND_API_KEY or a Resend outage) must
    // not surface as a 500 with an empty body — the client would then choke on
    // `response.json()`. Log it and still return the generic success response so
    // we neither crash nor leak whether the account exists.
    try {
      await sendPasswordResetEmail(email, tokenResult.token);
    } catch (error) {
      console.error('[forgot-password] Failed to send password reset email', error);
    }
  }

  return NextResponse.json({ success: true });
}
