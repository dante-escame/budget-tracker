import { NextResponse } from 'next/server';

import { extractRequestContext, parseBodyWithSchema } from '@/lib/auth/http';
import { mfaDisableSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';
import { mfaErrorResponse, requireRecentAuthUser } from '@/lib/auth/mfa-http';

export async function POST(request: Request) {
  const auth = await requireRecentAuthUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseBodyWithSchema(request, mfaDisableSchema);
  if (!parsed.ok) return parsed.response;

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    await authService.disableMfaMethod(auth.user.id, parsed.data.type, context);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return mfaErrorResponse(error);
  }
}
