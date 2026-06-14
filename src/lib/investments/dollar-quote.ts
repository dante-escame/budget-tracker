import 'server-only';

import { USD_BRL_QUOTE_URL } from '@/lib/investments/dollar';

// The USD→BRL rate is cached in-memory for 30 minutes so repeated page renders
// don't hammer the free AwesomeAPI endpoint. The cache survives across requests
// via `globalThis` (the same singleton pattern used by `crypto-quotes.ts`).

const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

interface CachedRate {
  rate: number; // BRL per 1 USD
  fetchedAt: number; // epoch millis
}

declare global {
  var __dollarQuoteCache__: CachedRate | undefined;
}

/**
 * Returns the live USD→BRL rate (BRL per 1 USD). A fresh value (< 30 min old) is
 * served from cache; a stale or missing one triggers a single AwesomeAPI call.
 * If the provider fails, the last known rate is served (even past the TTL) and an
 * explicit error is logged. Returns null only when no rate is available at all —
 * callers treat that as "no quote" and keep the position's fallback value.
 */
export async function getDollarQuoteBRL(): Promise<number | null> {
  const cached = globalThis.__dollarQuoteCache__;
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const response = await fetch(USD_BRL_QUOTE_URL, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`AwesomeAPI responded with ${response.status}`);
    }

    const data = (await response.json()) as {
      USDBRL?: { bid?: string } | undefined;
    };
    const rate = Number(data.USDBRL?.bid);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('AwesomeAPI returned a malformed USD-BRL bid.');
    }

    globalThis.__dollarQuoteCache__ = { rate, fetchedAt: Date.now() };
    return rate;
  } catch (error) {
    // Stale-on-error: keep whatever is cached so charts still render.
    console.error(
      '[dollar-quote] USD-BRL rate provider (AwesomeAPI) is not working — serving last cached rate.',
      error
    );
    return cached?.rate ?? null;
  }
}
