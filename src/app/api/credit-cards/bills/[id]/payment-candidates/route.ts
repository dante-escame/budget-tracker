import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';
import { unauthorized } from '@/lib/auth/http';
import { getCreditCardService } from '@/lib/credit-cards/runtime';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();

  if (!user) {
    return unauthorized('Authentication is required.');
  }

  const { id } = await params;

  const service = await getCreditCardService();
  const candidates = await service.listPaymentCandidates(user.id, id);

  return NextResponse.json({ candidates });
}
