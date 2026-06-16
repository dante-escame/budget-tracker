import { NextResponse } from 'next/server';

import { parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getInvestmentService } from '@/lib/investments/runtime';
import { bulkCreateInvestmentSchema } from '@/lib/investments/schemas';

export async function POST(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  // The whole array is validated first; only then are the rows inserted, so an
  // invalid row prevents the entire batch from being saved.
  const parsed = await parseBodyWithSchema(request, bulkCreateInvestmentSchema);
  if (!parsed.ok) return parsed.response;

  const investmentService = await getInvestmentService();
  const positions = await investmentService.createPositions(user.id, parsed.data);
  return NextResponse.json({ positions }, { status: 201 });
}
