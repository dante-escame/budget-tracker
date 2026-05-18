import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';

export async function POST() {
  const authService = await getAuthService();
  const result = await authService.validateRequestSession();

  if (result.session) {
    await authService.invalidateSession(result.session.id);
  }

  return NextResponse.json({ success: true });
}
