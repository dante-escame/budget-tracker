import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';
import { parseBodyWithSchema, unauthorized } from '@/lib/auth/http';
import { getBaseDataService } from '@/lib/base-data/runtime';
import { baseDataInputSchema } from '@/lib/base-data/schemas';
import { parseMonthParam } from '@/lib/entries/schemas';
import { reaisToCentavos } from '@/lib/entries/transform';

export async function GET() {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const baseDataService = await getBaseDataService();
  const baseData = await baseDataService.getBaseData(user.id);
  return NextResponse.json(baseData);
}

export async function PUT(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const parsed = await parseBodyWithSchema(request, baseDataInputSchema);
  if (!parsed.ok) return parsed.response;

  const baseDataService = await getBaseDataService();
  const record = await baseDataService.setBaseData(user.id, {
    baseMonth: parseMonthParam(parsed.data.baseMonth),
    baselineTotal: reaisToCentavos(parsed.data.baseline),
    currency: 'BRL',
  });

  return NextResponse.json(record);
}
