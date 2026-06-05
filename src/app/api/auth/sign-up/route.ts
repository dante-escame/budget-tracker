import { NextResponse } from 'next/server';

import {
  badRequest,
  conflict,
  extractRequestContext,
  parseBodyWithSchema,
  serializeUser,
} from '@/lib/auth/http';
import { signUpSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';
import { getEntryService } from '@/lib/entries/runtime';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  const parsed = await parseBodyWithSchema(request, signUpSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const user = await authService.createUser({ email, password, context });

    // Give the new user their own copy of the global default tagging rules so
    // imports are categorized from day one.
    const entryService = await getEntryService();
    await entryService.seedDefaultRulesForUser(user.id);

    const verification = await authService.issueToken(user.id, 'email_verification');

    await sendVerificationEmail(user.emailDisplay, verification.token);

    return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return conflict(error.message);
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    throw error;
  }
}
