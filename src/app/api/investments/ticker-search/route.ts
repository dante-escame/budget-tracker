import { NextResponse } from 'next/server';

import { unauthorized } from '@/lib/auth/http';
import { getAuthService } from '@/lib/auth/runtime';
import { searchB3Tickers } from '@/lib/investments/b3-quotes';

// Live B3 ticker search backing the investment forms' ticker picker. Proxies the
// provider server-side (no client CORS / token exposure) and returns
// picker-ready `{ ticker, label, kind? }` options.
export async function GET(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();
  if (!user) return unauthorized('Authentication is required.');

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) return NextResponse.json({ results: [] });

  const results = await searchB3Tickers(query);
  return NextResponse.json({ results });
}
