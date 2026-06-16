import { NextResponse } from 'next/server';

import { extractRequestContext, parseBodyWithSchema } from '@/lib/auth/http';
import { mfaConfirmEnrollSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';
import { mfaErrorResponse, requireRecentAuthUser } from '@/lib/auth/mfa-http';

export async function POST(request: Request) {
  const auth = await requireRecentAuthUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseBodyWithSchema(request, mfaConfirmEnrollSchema);
  if (!parsed.ok) return parsed.response;

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const result = await authService.confirmEnrollment(
      auth.user.id,
      parsed.data.type,
      parsed.data.code,
      context
    );

    return NextResponse.json({ backupCodes: result.backupCodes });
  } catch (error) {
    return mfaErrorResponse(error);
  }
}
