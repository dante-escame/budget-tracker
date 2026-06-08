import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';
import { badRequest, parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getCreditCardService } from '@/lib/credit-cards/runtime';
import { linkPaymentSchema } from '@/lib/credit-cards/schemas';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();

  if (!user) {
    return unauthorized('Authentication is required.');
  }

  const parsed = await parseBodyWithSchema(request, linkPaymentSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { id } = await params;

  const service = await getCreditCardService();
  const bill = await service.linkPayment(user.id, id, parsed.data.paymentEntryId);

  if (!bill) {
    return badRequest('Bill or payment entry not found.');
  }

  return NextResponse.json({ bill });
}
