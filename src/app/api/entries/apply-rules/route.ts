import { NextResponse } from 'next/server';

import { parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getEntryService } from '@/lib/entries/runtime';
import { applyRulesSchema, parseMonthParam } from '@/lib/entries/schemas';

export async function POST(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, applyRulesSchema);
  if (!parsed.ok) return parsed.response;

  const month = parseMonthParam(parsed.data.month);
  const entryService = await getEntryService();
  const summary = await entryService.applyRulesToMonth(user.id, month);
  return NextResponse.json(summary);
}
