import { NextResponse } from 'next/server';

import { serializeSession, serializeUser } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';

export async function GET() {
  const authService = await getAuthService();
  const result = await authService.validateRequestSession();

  if (!result.user || !result.session) {
    return NextResponse.json({
      session: null,
      user: null,
    });
  }

  return NextResponse.json({
    session: serializeSession(result.session),
    user: serializeUser(result.user),
  });
}
