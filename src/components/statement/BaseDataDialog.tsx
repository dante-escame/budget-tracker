'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { BaseData } from '@/lib/base-data';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);

export function BaseDataDialog({
  open,
  baseData,
  onClose,
  onSaved,
}: {
  open: boolean;
  baseData: BaseData.Record | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedYear, setSelectedYear] = useState(() => toYearValue(baseData));
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthNumber(baseData));
  const [baseline, setBaseline] = useState(() => toReaisInput(baseData));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (pending) return;
    onClose();
  }

  async function handleSave() {
    if (!selectedYear || !selectedMonth) {
      setError('Choose a base month.');
      return;
    }
    if (!/^-?\d+(\.\d+)?$/.test(baseline.trim())) {
      setError('Opening balance must be a number, e.g. 1500.00.');
      return;
    }

    const baseMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/base-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseMonth, baseline: baseline.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? 'Could not save base data.');
        return;
      }

      onSaved();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Base data</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Set the first month you want to track and your account balance at the
            end of the month before it. Every month&rsquo;s running balance builds
            on this baseline, and statements before the base month can&rsquo;t be
            imported.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth disabled={pending}>
              <InputLabel>Month</InputLabel>
              <Select
                label="Month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as number)}
              >
                {MONTH_NAMES.map((name, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={pending}>
              <InputLabel>Year</InputLabel>
              <Select
                label="Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as number)}
              >
                {YEARS.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label="Opening balance (R$)"
            value={baseline}
            onChange={(event) => setBaseline(event.target.value)}
            helperText="Balance at the close of the month before the base month."
            placeholder="0.00"
            disabled={pending}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={pending} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={pending}
          startIcon={
            pending ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function toYearValue(baseData: BaseData.Record | null): number {
  return baseData?.baseMonth.year ?? 0;
}

function toMonthNumber(baseData: BaseData.Record | null): number {
  return baseData?.baseMonth.month ?? 0;
}

// Centavos → a plain reais decimal string for the text input (e.g. 150000 → "1500.00").
function toReaisInput(baseData: BaseData.Record | null): string {
  if (!baseData) return '';
  return (baseData.baselineTotal / 100).toFixed(2);
}
