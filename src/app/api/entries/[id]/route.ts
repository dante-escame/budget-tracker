import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';
import { parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getEntryService } from '@/lib/entries/runtime';
import { entryUpdateSchema } from '@/lib/entries/schemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, entryUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const entryService = await getEntryService();
  const updated = await entryService.updateEntry(user.id, id, parsed.data);

  if (!updated) {
    return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
