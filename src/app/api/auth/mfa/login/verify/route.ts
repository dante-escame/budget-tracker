import { NextResponse } from 'next/server';

import {
  extractRequestContext,
  parseBodyWithSchema,
  serializeUser,
} from '@/lib/auth/http';
import { mfaLoginVerifySchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';
import { mfaErrorResponse } from '@/lib/auth/mfa-http';

export async function POST(request: Request) {
  const parsed = await parseBodyWithSchema(request, mfaLoginVerifySchema);
  if (!parsed.ok) return parsed.response;

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const authenticatedSession = await authService.completeLoginChallenge(
      parsed.data.code,
      context
    );

    return NextResponse.json({
      user: serializeUser(authenticatedSession.user),
      session: {
        id: authenticatedSession.sessionId,
        expiresAt: authenticatedSession.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    return mfaErrorResponse(error);
  }
}
