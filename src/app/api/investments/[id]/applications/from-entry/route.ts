import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getInvestmentService } from '@/lib/investments/runtime';

const linkEntrySchema = z.object({
  entryId: z.string().min(1, 'Entry ID is required.'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, linkEntrySchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const investmentService = await getInvestmentService();
  const linked = await investmentService.linkEntryToInvestment(
    user.id,
    id,
    parsed.data.entryId
  );
  if (!linked) return badRequest('Investment or entry not found.');

  return NextResponse.json({ linked: true });
}
