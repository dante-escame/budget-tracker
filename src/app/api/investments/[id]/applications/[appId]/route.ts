import { NextResponse } from 'next/server';

import { badRequest, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getInvestmentService } from '@/lib/investments/runtime';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const { appId } = await params;
  const investmentService = await getInvestmentService();
  const deleted = await investmentService.deleteApplication(user.id, appId);
  if (!deleted) return badRequest('Application not found.');

  return NextResponse.json({ deleted: true });
}
