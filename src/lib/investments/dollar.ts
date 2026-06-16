// Static metadata for the US dollar investment type. Pure data with no runtime
// dependencies, so it is safe to import from both Client Components (the forms)
// and server code (schemas, quote fetching). Mirrors `crypto-coins.ts`.

/** Max decimal places accepted for a held dollar amount (cents). */
export const DOLLAR_QUANTITY_DECIMALS = 2;

/** AwesomeAPI endpoint for the latest USD→BRL quote. */
export const USD_BRL_QUOTE_URL =
  'https://economia.awesomeapi.com.br/last/USD-BRL';
