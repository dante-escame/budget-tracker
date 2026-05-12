import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';

export async function GET() {
  const authService = await getAuthService();
  const requirement = await authService.getStepUpRequirementForSensitiveAction();

  return NextResponse.json(requirement);
}
