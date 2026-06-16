import { NextResponse } from 'next/server';

import { extractRequestContext } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { mfaErrorResponse } from '@/lib/auth/mfa-http';

export async function POST(request: Request) {
  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    const result = await authService.resendLoginChallenge(context);

    return NextResponse.json({ methodType: result.methodType });
  } catch (error) {
    return mfaErrorResponse(error);
  }
}
