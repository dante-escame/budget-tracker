// Static metadata for the crypto coins the app supports. Pure data with no
// runtime dependencies, so it is safe to import from both Client Components
// (the forms/picker) and server code (schemas, quote fetching).

export interface CryptoCoin {
  /** Human label shown in the picker. */
  label: string;
  /** CoinGecko coin id used by the `/simple/price` endpoint. */
  coingeckoId: string;
}

// Symbol → metadata. Symbols are what we persist on a crypto position.
export const CRYPTO_COINS = {
  BTC: { label: 'Bitcoin', coingeckoId: 'bitcoin' },
  ETH: { label: 'Ethereum', coingeckoId: 'ethereum' },
  BNB: { label: 'BNB', coingeckoId: 'binancecoin' },
  SOL: { label: 'Solana', coingeckoId: 'solana' },
  XRP: { label: 'XRP', coingeckoId: 'ripple' },
  ADA: { label: 'Cardano', coingeckoId: 'cardano' },
  DOGE: { label: 'Dogecoin', coingeckoId: 'dogecoin' },
  USDT: { label: 'Tether', coingeckoId: 'tether' },
  USDC: { label: 'USD Coin', coingeckoId: 'usd-coin' },
  MATIC: { label: 'Polygon', coingeckoId: 'matic-network' },
  DOT: { label: 'Polkadot', coingeckoId: 'polkadot' },
  LINK: { label: 'Chainlink', coingeckoId: 'chainlink' },
  AVAX: { label: 'Avalanche', coingeckoId: 'avalanche-2' },
} as const satisfies Record<string, CryptoCoin>;

export type CryptoSymbol = keyof typeof CRYPTO_COINS;

export const CRYPTO_COIN_SYMBOLS = Object.keys(CRYPTO_COINS) as CryptoSymbol[];

/** Max decimal places accepted for a crypto quantity (BTC satoshi-grade). */
export const CRYPTO_QUANTITY_DECIMALS = 8;

export function isCryptoSymbol(value: string): value is CryptoSymbol {
  return value in CRYPTO_COINS;
}
