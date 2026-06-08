import { NextResponse } from 'next/server';

import { badRequest, parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getInvestmentService } from '@/lib/investments/runtime';
import {
  addApplicationSchema,
  parseApplicationDate,
} from '@/lib/investments/schemas';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, addApplicationSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const investmentService = await getInvestmentService();
  const added = await investmentService.addApplication(user.id, id, {
    value: parsed.data.value,
    appliedAt: parseApplicationDate(parsed.data.appliedAt),
  });
  if (!added) return badRequest('Investment not found.');

  return NextResponse.json({ added: true }, { status: 201 });
}
