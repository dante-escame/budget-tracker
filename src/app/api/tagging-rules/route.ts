import { NextResponse } from 'next/server';

import { parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getEntryService } from '@/lib/entries/runtime';
import { taggingRuleInputSchema } from '@/lib/entries/schemas';

export async function GET() {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const entryService = await getEntryService();
  const rules = await entryService.listTaggingRules(user.id);
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, taggingRuleInputSchema);
  if (!parsed.ok) return parsed.response;

  const entryService = await getEntryService();
  const rule = await entryService.createTaggingRule(user.id, parsed.data);
  return NextResponse.json({ rule }, { status: 201 });
}
