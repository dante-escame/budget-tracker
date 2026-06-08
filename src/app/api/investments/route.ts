import { NextResponse } from 'next/server';

import { parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getInvestmentService } from '@/lib/investments/runtime';
import { createInvestmentSchema } from '@/lib/investments/schemas';

export async function POST(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, createInvestmentSchema);
  if (!parsed.ok) return parsed.response;

  const investmentService = await getInvestmentService();
  const position = await investmentService.createPosition(user.id, parsed.data);
  return NextResponse.json({ position }, { status: 201 });
}
