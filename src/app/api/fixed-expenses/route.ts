import { NextResponse } from 'next/server';

import { badRequest, parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getFixedExpenseService } from '@/lib/fixed-expenses/runtime';
import { markFixedSchema } from '@/lib/fixed-expenses/schemas';

export async function POST(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, markFixedSchema);
  if (!parsed.ok) return parsed.response;

  const fixedExpenseService = await getFixedExpenseService();
  const marked = await fixedExpenseService.markEntryAsFixed(
    user.id,
    parsed.data.entryId
  );
  if (!marked) return badRequest('Entry not found.');

  return NextResponse.json({ fixed: true });
}

export async function DELETE(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, markFixedSchema);
  if (!parsed.ok) return parsed.response;

  const fixedExpenseService = await getFixedExpenseService();
  const unmarked = await fixedExpenseService.unmarkEntry(
    user.id,
    parsed.data.entryId
  );
  if (!unmarked) return badRequest('Entry not found.');

  return NextResponse.json({ fixed: false });
}
