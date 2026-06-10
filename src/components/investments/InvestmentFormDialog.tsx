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
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  RISK_LABELS,
  TYPE_SUGGESTIONS,
} from '@/components/investments/constants';
import { reaisToCentavos } from '@/components/investments/format';

const RISKS: Investment.Risk[] = ['low', 'medium', 'high'];

interface FormState {
  name: string;
  category: Investment.Category;
  type: string;
  risk: Investment.Risk;
  currentValue: string; // reais
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
    };
  }
  return {
    name: '',
    category: 'fixed_income',
    type: '',
    risk: 'low',
    currentValue: '',
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

  async function handleSubmit() {
    if (form.name.trim() === '') {
      setError('Name is required.');
      return;
    }
    if (form.type.trim() === '') {
      setError('Type is required.');
      return;
    }

    const currentValue = reaisToCentavos(form.currentValue);
    if (form.currentValue.trim() !== '' && currentValue === null) {
      setError('Current value must be a valid amount.');
      return;
    }

    setPending(true);
    setError(null);

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      category: form.category,
      type: form.type.trim(),
      risk: form.risk,
    };
    if (currentValue !== null) body.currentValue = currentValue;

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
