'use client';

import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
import type { SxProps, Theme } from '@mui/material/styles';

import {
  B3_STOCK_OPTIONS,
  labelForB3Ticker,
  type B3TickerOption,
} from '@/lib/investments/b3-stocks';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Ticker picker that searches the live B3 provider (via `/api/investments/
 * ticker-search`) as the user types, so any listed ticker — not just the curated
 * set — can be selected. Curated tickers are always offered (instant, offline)
 * and merged with provider results. `onChange` reports the selected ticker plus
 * its `kind` when known, so the caller can keep the stock/FII category in sync.
 */
export function B3TickerAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  helperText,
  variant,
  size = 'small',
  fullWidth,
  sx,
}: {
  value: string;
  onChange: (ticker: string, kind?: B3TickerOption['kind']) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  variant?: TextFieldProps['variant'];
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<B3TickerOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced provider search on the typed term. All state updates happen inside
  // the timer callback (never synchronously in the effect body) to avoid the
  // cascading-render lint and so a fast typist doesn't fire a request per keypress.
  useEffect(() => {
    const term = search.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (term.length < MIN_SEARCH_LENGTH) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(
          `/api/investments/ticker-search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('search failed');
        const data = (await response.json()) as { results?: B3TickerOption[] };
        setResults(data.results ?? []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search]);

  // Curated + provider results, deduped by ticker. The current value is always
  // present so the field can render its label even if it isn't in either list.
  const options = useMemo(() => {
    const byTicker = new Map<string, B3TickerOption>();
    for (const option of B3_STOCK_OPTIONS) byTicker.set(option.ticker, option);
    for (const option of results) {
      if (!byTicker.has(option.ticker)) byTicker.set(option.ticker, option);
    }
    if (value && !byTicker.has(value)) {
      byTicker.set(value, { ticker: value, label: labelForB3Ticker(value) });
    }
    return [...byTicker.values()];
  }, [results, value]);

  const selected = value
    ? options.find((option) => option.ticker === value) ?? null
    : null;

  return (
    <Autocomplete
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option?.ticker ?? '', option?.kind)}
      onInputChange={(_, input, reason) => {
        // Only the user's own typing drives a provider search; ignore the input
        // updates MUI emits when an option is selected or the field is reset.
        if (reason === 'input') setSearch(input);
      }}
      getOptionLabel={(option) => `${option.ticker} · ${option.label}`}
      isOptionEqualToValue={(option, candidate) => option.ticker === candidate.ticker}
      loading={loading}
      noOptionsText={
        search.trim().length < MIN_SEARCH_LENGTH ? 'Type to search…' : 'No matches'
      }
      size={size}
      fullWidth={fullWidth}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          variant={variant}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
