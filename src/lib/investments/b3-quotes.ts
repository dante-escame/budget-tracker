import 'server-only';

import {
  B3_STOCKS,
  isB3Ticker,
  isB3TickerLike,
  type B3Ticker,
  type B3TickerOption,
} from '@/lib/investments/b3-stocks';

// B3 quotes are cached in-memory for 30 minutes so repeated page renders don't
// hammer the upstream endpoint. The cache survives across requests via
// `globalThis` (the same singleton pattern used by `crypto-quotes.ts`).
//
// Provider: Yahoo Finance's public chart endpoint, which returns BRL prices for
// B3 tickers (and FIIs) under the `.SA` suffix with no API key — e.g.
// `PETR4.SA` → meta.regularMarketPrice. It only takes one symbol per request, so
// we fetch the wanted tickers in parallel (the 30-min cache keeps volume tiny).

const CACHE_TTL_MS = 30 * 60 * 1000;
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const FETCH_TIMEOUT_MS = 8000;

interface CachedQuote {
  priceBrl: number;
  fetchedAt: number; // epoch millis
}

declare global {
  // key = B3 ticker (e.g. `PETR4`)
  var __b3QuoteCache__: Map<string, CachedQuote> | undefined;
}

function getCache(): Map<string, CachedQuote> {
  if (!globalThis.__b3QuoteCache__) {
    globalThis.__b3QuoteCache__ = new Map();
  }
  return globalThis.__b3QuoteCache__;
}

/**
 * Returns BRL prices keyed by B3 ticker (e.g. `PETR4`) for the requested
 * tickers. Fresh values (< 30 min old) are served from cache; stale or missing
 * ones trigger a Yahoo Finance fetch (one request per ticker, in parallel). If a
 * fetch fails, the last known cached price for that ticker is served (even past
 * the TTL) and an explicit error is logged. Tickers with no price available at
 * all are simply omitted — callers treat a missing price as zero.
 */
export async function getB3QuotesBRL(
  tickers: string[]
): Promise<Map<string, number>> {
  const cache = getCache();
  const now = Date.now();

  const wanted = [...new Set(tickers)].filter(isB3TickerLike);
  if (wanted.length === 0) return new Map();

  const stale = wanted.filter((ticker) => {
    const cached = cache.get(ticker);
    return !cached || now - cached.fetchedAt >= CACHE_TTL_MS;
  });

  if (stale.length > 0) {
    await refreshQuotes([...new Set(stale)], cache);
  }

  const result = new Map<string, number>();
  for (const ticker of wanted) {
    const cached = cache.get(ticker);
    if (cached) result.set(ticker, cached.priceBrl);
  }
  return result;
}

async function refreshQuotes(
  tickers: string[],
  cache: Map<string, CachedQuote>
): Promise<void> {
  // Yahoo Finance only accepts one symbol per chart request, so fetch in
  // parallel. Each ticker is isolated in its own try/catch (stale-on-error) so a
  // single failure can't wipe the others.
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const response = await fetch(`${YAHOO_CHART_URL}/${ticker}.SA`, {
          // A browser-like user-agent avoids the occasional Yahoo 401/429.
          headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
          cache: 'no-store',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error(`Yahoo Finance responded with ${response.status}`);
        }

        const data = (await response.json()) as {
          chart?: { result?: { meta?: { regularMarketPrice?: number } }[] };
        };
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price === 'number' && Number.isFinite(price)) {
          cache.set(ticker, { priceBrl: price, fetchedAt: Date.now() });
        }
      } catch (error) {
        // Stale-on-error: keep whatever is cached so charts still render.
        console.error(
          `[b3-quotes] Yahoo Finance quote for ${ticker} failed — keeping last cached price.`,
          error
        );
      }
    })
  );
}

/**
 * Searches the provider for B3-listed instruments matching `query` (a ticker
 * prefix or company name) and returns picker-ready options. Only `.SA`-listed
 * symbols that look like plain B3 tickers are returned; curated metadata
 * (label/kind) is preferred when the ticker is one we know. On any failure an
 * empty list is returned — the picker still offers the curated options.
 */
export async function searchB3Tickers(
  query: string
): Promise<B3TickerOption[]> {
  try {
    const url =
      `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}` +
      '&quotesCount=15&newsCount=0&lang=pt-BR&region=BR';
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Yahoo Finance search responded with ${response.status}`);
    }

    const data = (await response.json()) as {
      quotes?: {
        symbol?: string;
        shortname?: string;
        longname?: string;
      }[];
    };

    const seen = new Set<string>();
    const results: B3TickerOption[] = [];
    for (const quote of data.quotes ?? []) {
      const symbol = quote.symbol;
      // B3 symbols are suffixed `.SA` on Yahoo (e.g. `ALUP11.SA`).
      if (!symbol || !symbol.endsWith('.SA')) continue;
      const ticker = symbol.slice(0, -'.SA'.length);
      if (!isB3TickerLike(ticker) || seen.has(ticker)) continue;
      seen.add(ticker);

      const curated = isB3Ticker(ticker)
        ? B3_STOCKS[ticker as B3Ticker]
        : undefined;
      results.push({
        ticker,
        label: curated?.label ?? quote.longname ?? quote.shortname ?? ticker,
        kind: curated?.kind,
      });
    }
    return results;
  } catch (error) {
    console.error(`[b3-quotes] Yahoo Finance ticker search for "${query}" failed.`, error);
    return [];
  }
}
