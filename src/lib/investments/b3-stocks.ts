// Static metadata for the Brazilian (B3) stocks and FIIs the app supports. Pure
// data with no runtime dependencies, so it is safe to import from both Client
// Components (the forms/picker) and server code (schemas, quote fetching).
// Mirrors `crypto-coins.ts`.

export interface B3Stock {
  /** Human label shown in the picker (company / fund name). */
  label: string;
  /** Sector/segment, used as a default `type` suggestion. */
  sector: string;
  /**
   * Distinguishes a regular stock (ação) from a real-estate fund (FII). Maps to
   * the `stocks` and `reits` categories respectively.
   */
  kind: 'stock' | 'fii';
}

// Ticker → metadata. The B3 ticker (e.g. `PETR4`) is what we persist on the
// position and is the symbol brapi.dev expects, so no separate id is needed.
export const B3_STOCKS = {
  // Stocks (ações)
  PETR4: { label: 'Petrobras PN', sector: 'Energy', kind: 'stock' },
  PETR3: { label: 'Petrobras ON', sector: 'Energy', kind: 'stock' },
  VALE3: { label: 'Vale ON', sector: 'Commodities', kind: 'stock' },
  ITUB4: { label: 'Itaú Unibanco PN', sector: 'Banking', kind: 'stock' },
  BBDC4: { label: 'Bradesco PN', sector: 'Banking', kind: 'stock' },
  BBAS3: { label: 'Banco do Brasil ON', sector: 'Banking', kind: 'stock' },
  ABEV3: { label: 'Ambev ON', sector: 'Beverages', kind: 'stock' },
  ITSA4: { label: 'Itaúsa PN', sector: 'Holding', kind: 'stock' },
  B3SA3: { label: 'B3 ON', sector: 'Financials', kind: 'stock' },
  WEGE3: { label: 'WEG ON', sector: 'Industrials', kind: 'stock' },
  RENT3: { label: 'Localiza ON', sector: 'Car Rental', kind: 'stock' },
  SUZB3: { label: 'Suzano ON', sector: 'Pulp & Paper', kind: 'stock' },
  RADL3: { label: 'Raia Drogasil ON', sector: 'Retail', kind: 'stock' },
  PRIO3: { label: 'PRIO ON', sector: 'Energy', kind: 'stock' },
  ELET3: { label: 'Eletrobras ON', sector: 'Electricity', kind: 'stock' },
  GGBR4: { label: 'Gerdau PN', sector: 'Steel', kind: 'stock' },
  JBSS3: { label: 'JBS ON', sector: 'Food', kind: 'stock' },
  MGLU3: { label: 'Magazine Luiza ON', sector: 'Retail', kind: 'stock' },
  VBBR3: { label: 'Vibra Energia ON', sector: 'Energy', kind: 'stock' },
  EQTL3: { label: 'Equatorial ON', sector: 'Electricity', kind: 'stock' },

  // FIIs (real-estate funds) — modeled under the `reits` category.
  MXRF11: { label: 'Maxi Renda FII', sector: 'Hybrid', kind: 'fii' },
  HGLG11: { label: 'CSHG Logística FII', sector: 'Logistics', kind: 'fii' },
  KNRI11: { label: 'Kinea Renda Imobiliária FII', sector: 'Hybrid', kind: 'fii' },
  XPLG11: { label: 'XP Log FII', sector: 'Logistics', kind: 'fii' },
  XPML11: { label: 'XP Malls FII', sector: 'Shopping', kind: 'fii' },
  VISC11: { label: 'Vinci Shopping Centers FII', sector: 'Shopping', kind: 'fii' },
  KNCR11: { label: 'Kinea Rendimentos FII', sector: 'Paper', kind: 'fii' },
  HGBS11: { label: 'Hedge Brasil Shopping FII', sector: 'Shopping', kind: 'fii' },
  BCFF11: { label: 'BTG Pactual Fundo de Fundos FII', sector: 'Fund of Funds', kind: 'fii' },
  HGRE11: { label: 'CSHG Real Estate FII', sector: 'Corporate', kind: 'fii' },
} as const satisfies Record<string, B3Stock>;

export type B3Ticker = keyof typeof B3_STOCKS;

export const B3_TICKER_SYMBOLS = Object.keys(B3_STOCKS) as B3Ticker[];

/** B3 trades whole shares, so quantities are integers (no decimal places). */
export const B3_QUANTITY_DECIMALS = 0;

// An option shown in the ticker picker. `kind` is only known for curated
// tickers; live provider results may omit it (Yahoo doesn't reliably flag FIIs).
export interface B3TickerOption {
  ticker: string;
  label: string;
  kind?: B3Stock['kind'];
}

// Curated tickers as picker options, always offered even before/without a
// provider search so the common names load instantly.
export const B3_STOCK_OPTIONS: B3TickerOption[] = B3_TICKER_SYMBOLS.map(
  (ticker) => ({ ticker, label: B3_STOCKS[ticker].label, kind: B3_STOCKS[ticker].kind })
);

/**
 * Well-formed B3 ticker: four letters + one or two digits (e.g. `PETR4`,
 * `ALUP11`). Used to accept/validate tickers beyond the curated list so the
 * live provider search can cover the full B3 universe. Fractional tickers
 * (`PETR4F`) are out of scope, so no trailing letter is allowed.
 */
export const B3_TICKER_PATTERN = /^[A-Z]{4}\d{1,2}$/;

export function isB3Ticker(value: string): value is B3Ticker {
  return value in B3_STOCKS;
}

export function isB3TickerLike(value: string): boolean {
  return B3_TICKER_PATTERN.test(value);
}

/** Curated company/fund label for a ticker, falling back to the ticker itself. */
export function labelForB3Ticker(ticker: string): string {
  return isB3Ticker(ticker) ? B3_STOCKS[ticker].label : ticker;
}

/** Which investment category a ticker belongs to (`stocks` vs `reits`). */
export function categoryForB3Ticker(ticker: B3Ticker): 'stocks' | 'reits' {
  return B3_STOCKS[ticker].kind === 'fii' ? 'reits' : 'stocks';
}
