import 'server-only';

import { CRYPTO_COINS, isCryptoSymbol } from '@/lib/investments/crypto-coins';
import { logger } from '@/lib/observability/logger';

const quotesLog = logger.child({ module: 'crypto-quotes' });

// Quotes are cached in-memory for 30 minutes so repeated page renders don't
// hammer the free CoinGecko endpoint. The cache survives across requests via
// `globalThis` (the same singleton pattern used by the service/runtime).

const CACHE_TTL_MS = 30 * 60 * 1000;
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const FETCH_TIMEOUT_MS = 8000;

interface CachedQuote {
  priceBrl: number;
  fetchedAt: number; // epoch millis
}

declare global {
  // key = CoinGecko coin id
  var __cryptoQuoteCache__: Map<string, CachedQuote> | undefined;
}

function getCache(): Map<string, CachedQuote> {
  if (!globalThis.__cryptoQuoteCache__) {
    globalThis.__cryptoQuoteCache__ = new Map();
  }
  return globalThis.__cryptoQuoteCache__;
}

/**
 * Returns BRL prices keyed by coin symbol (e.g. `BTC`) for the requested
 * symbols. Fresh values (< 30 min old) are served from cache; stale or missing
 * ones trigger a single batched CoinGecko call. If the provider fails, the last
 * known cached price is served (even past the TTL) and an explicit error is
 * logged. Symbols with no price available at all are simply omitted — callers
 * treat a missing price as zero.
 */
export async function getCryptoQuotesBRL(
  symbols: string[]
): Promise<Map<string, number>> {
  const cache = getCache();
  const now = Date.now();

  const wanted = [...new Set(symbols)].filter(isCryptoSymbol);
  if (wanted.length === 0) return new Map();

  const staleIds = wanted
    .map((symbol) => CRYPTO_COINS[symbol].coingeckoId)
    .filter((id) => {
      const cached = cache.get(id);
      return !cached || now - cached.fetchedAt >= CACHE_TTL_MS;
    });

  if (staleIds.length > 0) {
    await refreshQuotes([...new Set(staleIds)], cache);
  }

  const result = new Map<string, number>();
  for (const symbol of wanted) {
    const cached = cache.get(CRYPTO_COINS[symbol].coingeckoId);
    if (cached) result.set(symbol, cached.priceBrl);
  }
  return result;
}

async function refreshQuotes(
  ids: string[],
  cache: Map<string, CachedQuote>
): Promise<void> {
  const url = `${COINGECKO_URL}?ids=${ids.join(',')}&vs_currencies=brl`;

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`CoinGecko responded with ${response.status}`);
    }

    const data = (await response.json()) as Record<
      string,
      { brl?: number } | undefined
    >;
    const fetchedAt = Date.now();
    for (const id of ids) {
      const price = data[id]?.brl;
      if (typeof price === 'number' && Number.isFinite(price)) {
        cache.set(id, { priceBrl: price, fetchedAt });
      }
    }
  } catch (error) {
    // Stale-on-error: keep whatever is cached so charts still render.
    quotesLog.error(
      { err: error },
      'Crypto price provider (CoinGecko) is not working — serving last cached prices.'
    );
  }
}
