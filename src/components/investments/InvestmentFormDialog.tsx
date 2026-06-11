'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import type { Investment } from '@/lib/investments';
import { B3_QUANTITY_DECIMALS } from '@/lib/investments/b3-stocks';
import { B3TickerAutocomplete } from '@/components/investments/B3TickerAutocomplete';
import {
  CRYPTO_COINS,
  CRYPTO_COIN_SYMBOLS,
  CRYPTO_QUANTITY_DECIMALS,
} from '@/lib/investments/crypto-coins';
import { DOLLAR_QUANTITY_DECIMALS } from '@/lib/investments/dollar';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  RISK_LABELS,
  TYPE_SUGGESTIONS,
} from '@/components/investments/constants';
import {
  formatCurrency,
  parseCryptoQuantity,
  reaisToCentavos,
} from '@/components/investments/format';

const RISKS: Investment.Risk[] = ['low', 'medium', 'high'];

interface FormState {
  name: string;
  category: Investment.Category;
  type: string;
  risk: Investment.Risk;
  currentValue: string; // reais (manual categories)
  coinSymbol: string; // crypto
  tickerSymbol: string; // stocks/reits
  quantity: string; // crypto/dollar/stocks/reits
}

function initialState(investment?: Investment.PositionRecord): FormState {
  if (investment) {
    return {
      name: investment.name,
      category: investment.category,
      type: investment.type,
      risk: investment.risk,
      currentValue: investment.storedCurrentValue > 0
        ? (investment.storedCurrentValue / 100).toString()
        : '',
      coinSymbol: investment.coinSymbol ?? '',
      tickerSymbol: investment.tickerSymbol ?? '',
      quantity: investment.quantity != null ? investment.quantity.toString() : '',
    };
  }
  return {
    name: '',
    category: 'fixed_income',
    type: '',
    risk: 'low',
    currentValue: '',
    coinSymbol: '',
    tickerSymbol: '',
    quantity: '',
  };
}

export function InvestmentFormDialog({
  open,
  investment,
  onClose,
  onSaved,
}: {
  open: boolean;
  investment?: Investment.PositionRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Form state is seeded from props on mount; the parent remounts this dialog
  // (via a changing `key`) each time it opens, which resets the fields.
  const [form, setForm] = useState<FormState>(() => initialState(investment));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCrypto = form.category === 'crypto';
  const isDollar = form.category === 'dollar';
  const isStock = form.category === 'stocks' || form.category === 'reits';

  async function handleSubmit() {
    if (form.name.trim() === '') {
      setError('Name is required.');
      return;
    }
    if (form.type.trim() === '') {
      setError('Type is required.');
      return;
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      category: form.category,
      type: form.type.trim(),
      risk: form.risk,
    };

    if (isCrypto) {
      if (!form.coinSymbol) {
        setError('Select a coin for crypto positions.');
        return;
      }
      const quantity = parseCryptoQuantity(form.quantity, CRYPTO_QUANTITY_DECIMALS);
      if (quantity === null) {
        setError(`Enter a valid quantity (max ${CRYPTO_QUANTITY_DECIMALS} decimals).`);
        return;
      }
      body.coinSymbol = form.coinSymbol;
      body.quantity = quantity;
      // Crypto value is derived from the live quote; reset any stored manual one.
      if (investment) {
        body.tickerSymbol = null;
        body.currentValue = 0;
      }
    } else if (isDollar) {
      const quantity = parseCryptoQuantity(form.quantity, DOLLAR_QUANTITY_DECIMALS);
      if (quantity === null) {
        setError(`Enter a valid amount (max ${DOLLAR_QUANTITY_DECIMALS} decimals).`);
        return;
      }
      body.quantity = quantity;
      // Dollar value is derived from the live USD→BRL quote; never a coin/ticker
      // or a stored manual value.
      if (investment) {
        body.coinSymbol = null;
        body.tickerSymbol = null;
        body.currentValue = 0;
      }
    } else if (isStock) {
      if (!form.tickerSymbol) {
        setError('Select a ticker for stock and FII positions.');
        return;
      }
      const quantity = parseCryptoQuantity(form.quantity, B3_QUANTITY_DECIMALS);
      if (quantity === null) {
        setError('Enter a valid quantity (whole number of shares).');
        return;
      }
      body.tickerSymbol = form.tickerSymbol;
      body.quantity = quantity;
      // Stock/FII value is derived from the live B3 quote; never a coin or a
      // stored manual value.
      if (investment) {
        body.coinSymbol = null;
        body.currentValue = 0;
      }
    } else {
      const currentValue = reaisToCentavos(form.currentValue);
      if (form.currentValue.trim() !== '' && currentValue === null) {
        setError('Current value must be a valid amount.');
        return;
      }
      if (currentValue !== null) body.currentValue = currentValue;
      // Clear any quote-derived fields when editing a position into a manual category.
      if (investment) {
        body.coinSymbol = null;
        body.tickerSymbol = null;
        body.quantity = null;
      }
    }

    setPending(true);
    setError(null);

    const url = investment ? `/api/investments/${investment.id}` : '/api/investments';

    try {
      const response = await fetch(url, {
        method: investment ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError((result?.error as string) || 'An error occurred.');
        setPending(false);
        return;
      }

      setPending(false);
      onSaved();
      onClose();
    } catch {
      setError('Network error. Please try again.');
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{investment ? 'Edit investment' : 'Add investment'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            fullWidth
            autoFocus
          />

          <TextField
            select
            label="Category"
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                category: event.target.value as Investment.Category,
                type: '',
                // Ticker options differ per category (stocks vs FIIs), so reset it.
                tickerSymbol: '',
              }))
            }
            fullWidth
          >
            {CATEGORY_ORDER.map((category) => (
              <MenuItem key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            freeSolo
            options={TYPE_SUGGESTIONS[form.category]}
            inputValue={form.type}
            onInputChange={(_, value) =>
              setForm((prev) => ({ ...prev, type: value }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Type"
                helperText="Pick a suggestion or type your own (sector, instrument…)."
              />
            )}
          />

          <TextField
            select
            label="Risk"
            value={form.risk}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, risk: event.target.value as Investment.Risk }))
            }
            fullWidth
          >
            {RISKS.map((risk) => (
              <MenuItem key={risk} value={risk}>
                {RISK_LABELS[risk]}
              </MenuItem>
            ))}
          </TextField>

          {isCrypto ? (
            <>
              <TextField
                select
                label="Coin"
                value={form.coinSymbol}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, coinSymbol: event.target.value }))
                }
                fullWidth
              >
                {CRYPTO_COIN_SYMBOLS.map((symbol) => (
                  <MenuItem key={symbol} value={symbol}>
                    {symbol} · {CRYPTO_COINS[symbol].label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Quantity"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                helperText={`Amount held (up to ${CRYPTO_QUANTITY_DECIMALS} decimals). Value is computed from the live BRL quote.`}
                fullWidth
              />

              {investment && (
                <TextField
                  label="Current value (live)"
                  value={formatCurrency(investment.currentValue, investment.currency)}
                  helperText="Computed from quantity × the latest BRL price."
                  slotProps={{ input: { readOnly: true } }}
                  fullWidth
                />
              )}
            </>
          ) : isDollar ? (
            <>
              <TextField
                label="Amount"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                helperText={`Dollars held (up to ${DOLLAR_QUANTITY_DECIMALS} decimals). Value is computed from the live USD→BRL quote.`}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">US$</InputAdornment>,
                  },
                }}
                fullWidth
              />

              {investment && (
                <TextField
                  label="Current value (live)"
                  value={formatCurrency(investment.currentValue, investment.currency)}
                  helperText="Computed from amount × the latest USD→BRL rate."
                  slotProps={{ input: { readOnly: true } }}
                  fullWidth
                />
              )}
            </>
          ) : isStock ? (
            <>
              <B3TickerAutocomplete
                value={form.tickerSymbol}
                onChange={(ticker, kind) =>
                  setForm((prev) => ({
                    ...prev,
                    tickerSymbol: ticker,
                    // When the provider tells us the kind, keep the category in
                    // sync (FII → reits, stock → stocks); otherwise leave the
                    // user's choice untouched.
                    category: kind
                      ? kind === 'fii'
                        ? 'reits'
                        : 'stocks'
                      : prev.category,
                  }))
                }
                label="Ticker"
                helperText="Search by ticker (PETR4, ALUP11) or company name."
                fullWidth
              />

              <TextField
                label="Quantity"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                helperText="Number of shares held. Value is computed from the live BRL quote."
                fullWidth
              />

              {investment && (
                <TextField
                  label="Current value (live)"
                  value={formatCurrency(investment.currentValue, investment.currency)}
                  helperText="Computed from quantity × the latest B3 price."
                  slotProps={{ input: { readOnly: true } }}
                  fullWidth
                />
              )}
            </>
          ) : (
            <TextField
              label="Current value"
              value={form.currentValue}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, currentValue: event.target.value }))
              }
              helperText="Optional market value. Defaults to the total applied until set."
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                },
              }}
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={pending}>
          {investment ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
