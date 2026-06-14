'use client';

import { useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

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
} from '@/components/investments/constants';
import { parseCryptoQuantity, reaisToCentavos } from '@/components/investments/format';

const RISKS: Investment.Risk[] = ['low', 'medium', 'high'];

interface RowState {
  key: string;
  name: string;
  category: Investment.Category;
  type: string;
  risk: Investment.Risk;
  currentValue: string; // reais (manual categories)
  coinSymbol: string; // crypto
  tickerSymbol: string; // stocks/reits
  quantity: string; // crypto/dollar/stocks/reits
  error: string | null;
}

let nextRowId = 0;

function emptyRow(seed?: Pick<RowState, 'category' | 'type' | 'risk'>): RowState {
  return {
    key: `row-${nextRowId++}`,
    name: '',
    category: seed?.category ?? 'fixed_income',
    type: seed?.type ?? '',
    risk: seed?.risk ?? 'low',
    currentValue: '',
    coinSymbol: '',
    tickerSymbol: '',
    quantity: '',
    error: null,
  };
}

type RowResult =
  | { payload: Record<string, unknown> }
  | { error: string };

// Validates a single row and produces the API payload, mirroring the server
// schema (crypto requires coin + quantity and ignores the manual R$ value).
function validateRow(row: RowState): RowResult {
  if (row.name.trim() === '') return { error: 'Name is required.' };
  if (row.type.trim() === '') return { error: 'Type is required.' };

  if (row.category === 'crypto') {
    if (!row.coinSymbol) return { error: 'Select a coin.' };
    const quantity = parseCryptoQuantity(row.quantity, CRYPTO_QUANTITY_DECIMALS);
    if (quantity === null) {
      return { error: `Enter a valid quantity (max ${CRYPTO_QUANTITY_DECIMALS} decimals).` };
    }
    return {
      payload: {
        name: row.name.trim(),
        category: row.category,
        type: row.type.trim(),
        risk: row.risk,
        coinSymbol: row.coinSymbol,
        quantity,
      },
    };
  }

  if (row.category === 'dollar') {
    const quantity = parseCryptoQuantity(row.quantity, DOLLAR_QUANTITY_DECIMALS);
    if (quantity === null) {
      return { error: `Enter a valid amount (max ${DOLLAR_QUANTITY_DECIMALS} decimals).` };
    }
    return {
      payload: {
        name: row.name.trim(),
        category: row.category,
        type: row.type.trim(),
        risk: row.risk,
        quantity,
      },
    };
  }

  if (row.category === 'stocks' || row.category === 'reits') {
    if (!row.tickerSymbol) return { error: 'Select a ticker.' };
    const quantity = parseCryptoQuantity(row.quantity, B3_QUANTITY_DECIMALS);
    if (quantity === null) {
      return { error: 'Enter a valid quantity (whole number of shares).' };
    }
    return {
      payload: {
        name: row.name.trim(),
        category: row.category,
        type: row.type.trim(),
        risk: row.risk,
        tickerSymbol: row.tickerSymbol,
        quantity,
      },
    };
  }

  const currentValue = reaisToCentavos(row.currentValue);
  if (row.currentValue.trim() !== '' && currentValue === null) {
    return { error: 'Current value must be a valid amount.' };
  }
  const payload: Record<string, unknown> = {
    name: row.name.trim(),
    category: row.category,
    type: row.type.trim(),
    risk: row.risk,
  };
  if (currentValue !== null) payload.currentValue = currentValue;
  return { payload };
}

export function InvestmentBulkFormDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (count: number) => void;
}) {
  const [rows, setRows] = useState<RowState[]>(() => [emptyRow()]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchRow(index: number, patch: Partial<RowState>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch, error: null } : row))
    );
  }

  function addRowBelow(index: number) {
    setRows((prev) => {
      const source = prev[index];
      const next = [...prev];
      next.splice(index + 1, 0, emptyRow(source));
      return next;
    });
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit() {
    const results = rows.map(validateRow);
    const hasErrors = results.some((result) => 'error' in result);

    if (hasErrors) {
      setRows((prev) =>
        prev.map((row, i) => {
          const result = results[i];
          return { ...row, error: 'error' in result ? result.error : null };
        })
      );
      setError('Fix the highlighted rows before adding.');
      return;
    }

    const payload = results.map((result) =>
      'payload' in result ? result.payload : {}
    );

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/investments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError((result?.error as string) || 'An error occurred.');
        setPending(false);
        return;
      }

      setPending(false);
      onSaved(payload.length);
      onClose();
    } catch {
      setError('Network error. Please try again.');
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} fullWidth maxWidth="lg">
      <DialogTitle>Add investments</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TableContainer>
            <Table size="small" aria-label="New investments">
              <TableHead>
                <TableRow sx={{ bgcolor: 'secondary.light' }}>
                  <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Risk</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>
                    Current value
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => {
                  const isCrypto = row.category === 'crypto';
                  const isDollar = row.category === 'dollar';
                  const isStock =
                    row.category === 'stocks' || row.category === 'reits';
                  return (
                    <TableRow key={row.key} hover sx={{ verticalAlign: 'top' }}>
                      <TableCell>
                        <TextFieldCell
                          value={row.name}
                          error={row.error}
                          onChange={(value) => patchRow(index, { name: value })}
                          autoFocus={index === 0}
                        />
                      </TableCell>

                      <TableCell>
                        <CellTextField
                          select
                          value={row.category}
                          onChange={(value) =>
                            patchRow(index, {
                              category: value as Investment.Category,
                              type: '',
                              tickerSymbol: '',
                            })
                          }
                        >
                          {CATEGORY_ORDER.map((category) => (
                            <MenuItem key={category} value={category}>
                              {CATEGORY_LABELS[category]}
                            </MenuItem>
                          ))}
                        </CellTextField>
                      </TableCell>

                      <TableCell>
                        <CellTextField
                          value={row.type}
                          onChange={(value) => patchRow(index, { type: value })}
                          placeholder="Sector, instrument…"
                        />
                      </TableCell>

                      <TableCell>
                        <CellTextField
                          select
                          value={row.risk}
                          onChange={(value) =>
                            patchRow(index, { risk: value as Investment.Risk })
                          }
                        >
                          {RISKS.map((risk) => (
                            <MenuItem key={risk} value={risk}>
                              {RISK_LABELS[risk]}
                            </MenuItem>
                          ))}
                        </CellTextField>
                      </TableCell>

                      <TableCell>
                        {isCrypto ? (
                          <Stack direction="row" spacing={1}>
                            <CellTextField
                              select
                              value={row.coinSymbol}
                              onChange={(value) => patchRow(index, { coinSymbol: value })}
                              placeholder="Coin"
                              sx={{ minWidth: 96 }}
                            >
                              {CRYPTO_COIN_SYMBOLS.map((symbol) => (
                                <MenuItem key={symbol} value={symbol}>
                                  {symbol} · {CRYPTO_COINS[symbol].label}
                                </MenuItem>
                              ))}
                            </CellTextField>
                            <CellTextField
                              value={row.quantity}
                              onChange={(value) => patchRow(index, { quantity: value })}
                              placeholder="Quantity"
                            />
                          </Stack>
                        ) : isDollar ? (
                          <CellTextField
                            value={row.quantity}
                            onChange={(value) => patchRow(index, { quantity: value })}
                            startAdornment="US$"
                            placeholder="Amount"
                          />
                        ) : isStock ? (
                          <Stack direction="row" spacing={1}>
                            <B3TickerAutocomplete
                              value={row.tickerSymbol}
                              onChange={(ticker, kind) =>
                                patchRow(index, {
                                  tickerSymbol: ticker,
                                  // Keep the category aligned with the ticker's
                                  // kind when the provider reports it.
                                  category: kind
                                    ? kind === 'fii'
                                      ? 'reits'
                                      : 'stocks'
                                    : row.category,
                                })
                              }
                              placeholder="Ticker"
                              variant="standard"
                              sx={{ minWidth: 150 }}
                            />
                            <CellTextField
                              value={row.quantity}
                              onChange={(value) => patchRow(index, { quantity: value })}
                              placeholder="Shares"
                            />
                          </Stack>
                        ) : (
                          <CellTextField
                            value={row.currentValue}
                            onChange={(value) => patchRow(index, { currentValue: value })}
                            startAdornment="R$"
                          />
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Add row below">
                          <IconButton size="small" onClick={() => addRowBelow(index)}>
                            <AddRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove row">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => removeRow(index)}
                              disabled={rows.length === 1}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" color="text.secondary">
            Crypto positions are valued from a live BRL quote (coin × quantity),
            dollar positions from the live USD→BRL rate (amount × rate), and
            stock/FII positions from the live B3 price (shares × price). Other
            categories use the optional manual value, which defaults to the total
            applied until set.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={pending}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Compact field used inside the table cells. Wraps MUI TextField so callers
// pass a plain string value/onChange and an optional R$ adornment.
function CellTextField({
  value,
  onChange,
  select,
  children,
  placeholder,
  startAdornment,
  autoFocus,
  error,
  helperText,
  sx,
}: {
  value: string;
  onChange: (value: string) => void;
  select?: boolean;
  children?: ReactNode;
  placeholder?: string;
  startAdornment?: string;
  autoFocus?: boolean;
  error?: boolean;
  helperText?: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <TextField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      select={select}
      placeholder={placeholder}
      autoFocus={autoFocus}
      error={error}
      helperText={helperText}
      size="small"
      variant="standard"
      fullWidth
      sx={sx}
      slotProps={
        startAdornment
          ? {
              input: {
                startAdornment: (
                  <InputAdornment position="start">{startAdornment}</InputAdornment>
                ),
              },
            }
          : undefined
      }
    >
      {children}
    </TextField>
  );
}

// A name cell that also surfaces the per-row validation error as helper text.
function TextFieldCell({
  value,
  error,
  onChange,
  autoFocus,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <CellTextField
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      error={Boolean(error)}
      helperText={error ?? undefined}
      placeholder="Name"
    />
  );
}
