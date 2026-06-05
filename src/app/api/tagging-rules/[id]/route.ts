import { NextResponse } from 'next/server';

import { badRequest, parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { getEntryService } from '@/lib/entries/runtime';
import { taggingRuleInputSchema } from '@/lib/entries/schemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, taggingRuleInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const entryService = await getEntryService();
  const rule = await entryService.updateTaggingRule(user.id, id, parsed.data);
  if (!rule) return badRequest('Tagging rule not found.');

  return NextResponse.json({ rule });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const { id } = await params;
  const entryService = await getEntryService();
  const deleted = await entryService.deleteTaggingRule(user.id, id);
  if (!deleted) return badRequest('Tagging rule not found.');

  return NextResponse.json({ deleted: true });
}
