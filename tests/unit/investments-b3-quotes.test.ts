import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `b3-quotes.ts` imports 'server-only', which throws outside an RSC; stub it.
vi.mock('server-only', () => ({}));

import { getB3QuotesBRL, searchB3Tickers } from '@/lib/investments/b3-quotes';

// Mimics Yahoo Finance's `/v8/finance/chart/{symbol}` response.
function chartResponse(priceBrl: number): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      chart: {
        result: [{ meta: { regularMarketPrice: priceBrl, currency: 'BRL' } }],
        error: null,
      },
    }),
  } as Response;
}

describe('getB3QuotesBRL', () => {
  beforeEach(() => {
    // Reset the in-memory cache that survives via globalThis between calls.
    globalThis.__b3QuoteCache__ = undefined;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches one request per ticker and returns BRL prices keyed by ticker', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      chartResponse(url.includes('MXRF11') ? 10.2 : 38.5)
    );
    vi.stubGlobal('fetch', fetchMock);

    const quotes = await getB3QuotesBRL(['PETR4', 'MXRF11']);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Yahoo uses the `.SA` suffix on B3 tickers.
    expect(fetchMock.mock.calls[0][0]).toContain('PETR4.SA');
    expect(quotes.get('PETR4')).toBe(38.5);
    expect(quotes.get('MXRF11')).toBe(10.2);
  });

  it('ignores malformed tickers without hitting the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Well-formed but uncurated tickers (e.g. ALUP11) are now fetched live, so
    // only malformed inputs are filtered out before any network call.
    const quotes = await getB3QuotesBRL(['not-a-ticker']);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(quotes.size).toBe(0);
  });

  it('serves cached prices on the second call (no second fetch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chartResponse(60));
    vi.stubGlobal('fetch', fetchMock);

    await getB3QuotesBRL(['VALE3']);
    const second = await getB3QuotesBRL(['VALE3']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.get('VALE3')).toBe(60);
  });

  it('falls back to the last cached price when the provider fails', async () => {
    const okThenFail = vi
      .fn()
      .mockResolvedValueOnce(chartResponse(32))
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', okThenFail);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Prime the cache.
    await getB3QuotesBRL(['ITUB4']);
    // Force the entry to look stale so the next call re-fetches (and fails).
    globalThis.__b3QuoteCache__!.set('ITUB4', { priceBrl: 32, fetchedAt: 0 });

    const quotes = await getB3QuotesBRL(['ITUB4']);

    expect(okThenFail).toHaveBeenCalledTimes(2);
    expect(quotes.get('ITUB4')).toBe(32); // stale-on-error
  });
});

// Mimics Yahoo Finance's `/v1/finance/search` response.
function searchResponse(
  quotes: { symbol?: string; shortname?: string; longname?: string }[]
): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ quotes }),
  } as Response;
}

describe('searchB3Tickers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only .SA B3-looking tickers, preferring curated labels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        searchResponse([
          { symbol: 'ALUP11.SA', shortname: 'ALUPAR INVESTIMENTO' },
          { symbol: 'PETR4.SA', shortname: 'PETROBRAS PN' },
          { symbol: 'AAPL', shortname: 'Apple Inc.' }, // not .SA → dropped
          { symbol: 'PETR4F.SA', shortname: 'fractional' }, // not ticker-shaped → dropped
        ])
      )
    );

    const results = await searchB3Tickers('alup');

    expect(results.map((r) => r.ticker)).toEqual(['ALUP11', 'PETR4']);
    // Uncurated ticker keeps the provider name; no kind is asserted.
    expect(results[0]).toEqual({ ticker: 'ALUP11', label: 'ALUPAR INVESTIMENTO', kind: undefined });
    // Curated ticker wins the curated label + kind.
    expect(results[1]).toEqual({ ticker: 'PETR4', label: 'Petrobras PN', kind: 'stock' });
  });

  it('returns an empty list when the provider fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await searchB3Tickers('xyz')).toEqual([]);
  });
});
