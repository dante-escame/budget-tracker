import { NextResponse } from 'next/server';

import { notFound, parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getInvestmentService } from '@/lib/investments/runtime';
import { updateInvestmentSchema } from '@/lib/investments/schemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, updateInvestmentSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const investmentService = await getInvestmentService();
  const position = await investmentService.updatePosition(user.id, id, parsed.data);
  if (!position) return notFound('Investment not found.');

  return NextResponse.json({ position });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const { id } = await params;
  const investmentService = await getInvestmentService();
  const deleted = await investmentService.deletePosition(user.id, id);
  if (!deleted) return notFound('Investment not found.');

  return NextResponse.json({ deleted: true });
}
