import { NextResponse } from 'next/server';

import {
  badRequest,
  extractRequestContext,
  parseBodyWithSchema,
  serializeUser,
  unauthorized,
} from '@/lib/auth/http';
import { signInSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';
import {
  AuthenticationRequiredError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '@/lib/auth/service';

export async function POST(request: Request) {
  const parsed = await parseBodyWithSchema(request, signInSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const user = await authService.verifyPasswordLogin({ email, password, context });

    if (await authService.userHasActiveMfa(user.id)) {
      const challenge = await authService.beginLoginChallenge(user, context);

      return NextResponse.json({
        mfaRequired: true,
        methodType: challenge.methodType,
      });
    }

    const authenticatedSession = await authService.createSession(user, context);

    return NextResponse.json({
      user: serializeUser(authenticatedSession.user),
      session: {
        id: authenticatedSession.sessionId,
        expiresAt: authenticatedSession.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (
      error instanceof InvalidCredentialsError ||
      error instanceof AuthenticationRequiredError
    ) {
      return unauthorized('Invalid email or password.');
    }

    if (error instanceof EmailNotVerifiedError) {
      return unauthorized(error.message);
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    throw error;
  }
}
