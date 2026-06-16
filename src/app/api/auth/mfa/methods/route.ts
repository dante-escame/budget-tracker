import { NextResponse } from 'next/server';

import { unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';

export async function GET() {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const methods = await authService.listMfaMethods(user.id);

  return NextResponse.json({
    methods: methods.map((method) => ({
      type: method.type,
      status: method.status,
      verifiedAt: method.verifiedAt?.toISOString() ?? null,
      lastUsedAt: method.lastUsedAt?.toISOString() ?? null,
    })),
  });
}
