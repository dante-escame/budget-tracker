import type { Investment } from '@/lib/investments';

// English labels for each category (the underlying values are stored in English
// already; this keeps display in one place).
export const CATEGORY_LABELS: Record<Investment.Category, string> = {
  fixed_income: 'Fixed Income',
  crypto: 'Crypto',
  stocks: 'Stocks',
  reits: 'REITs',
};

export const CATEGORY_ORDER: Investment.Category[] = [
  'fixed_income',
  'crypto',
  'stocks',
  'reits',
];

// Slice/legend color per category, used by the distribution pie chart.
export const CATEGORY_COLOR: Record<Investment.Category, string> = {
  fixed_income: '#2e7d32',
  crypto: '#ed6c02',
  stocks: '#1976d2',
  reits: '#9c27b0',
};

export const CHART_COLORS: string[] = [
  '#4C72B0',
  '#DD8452',
  '#55A868',
  '#C44E52',
  '#8172B3',
  '#937860',
  '#DA8BC3',
  '#8C8C8C',
  '#CCB974',
  '#64B5CD',
  '#E377C2',
  '#7F7F7F',
  '#BCBD22',
  '#17BECF',
  '#AEC7E8',
  '#FFBB78',
  '#98DF8A',
  '#F7B6D2',
];

export const RISK_LABELS: Record<Investment.Risk, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

// MUI palette color per risk level: green / yellow / red.
export const RISK_COLOR: Record<
  Investment.Risk,
  'success' | 'warning' | 'error'
> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
};

// Suggested `type` values per category — surfaced as Autocomplete options while
// still allowing free text (sectors, instruments, coin kinds…).
export const TYPE_SUGGESTIONS: Record<Investment.Category, string[]> = {
  fixed_income: ['Selic', '% CDI', 'Prefixado'],
  crypto: ['Stable Coin', 'Meme Coin', 'Bitcoin', 'Altcoin'],
  stocks: ['Banking', 'Electricity', 'Telephony', 'Retail', 'Commodities', 'Technology'],
  reits: ['Logistics', 'Shopping', 'Corporate', 'Paper', 'Hybrid'],
};
