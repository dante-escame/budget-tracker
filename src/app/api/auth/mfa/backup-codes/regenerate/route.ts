import { NextResponse } from 'next/server';

import { extractRequestContext } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { mfaErrorResponse, requireRecentAuthUser } from '@/lib/auth/mfa-http';

export async function POST(request: Request) {
  const auth = await requireRecentAuthUser();
  if (!auth.ok) return auth.response;

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const backupCodes = await authService.regenerateBackupCodes(auth.user.id, context);

    return NextResponse.json({ backupCodes });
  } catch (error) {
    return mfaErrorResponse(error);
  }
}
