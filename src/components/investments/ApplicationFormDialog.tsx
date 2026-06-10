'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import type { Investment } from '@/lib/investments';
import { reaisToCentavos } from '@/components/investments/format';

type Flow = 'income' | 'outcome';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ApplicationFormDialog({
  open,
  investment,
  positions,
  onClose,
  onSaved,
}: {
  open: boolean;
  investment: Investment.PositionRecord | null;
  positions?: Investment.PositionRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [flow, setFlow] = useState<Flow>('outcome');
  const [value, setValue] = useState('');
  const [appliedAt, setAppliedAt] = useState(today());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = investment?.id ?? selectedId;

  async function handleSubmit() {
    if (!resolvedId) {
      setError('Select an investment position.');
      return;
    }

    const centavos = reaisToCentavos(value);
    if (centavos === null || centavos <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/investments/${resolvedId}/applications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: centavos, flow, appliedAt }),
        }
      );

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

  const dialogTitle = flow === 'income' ? 'Add income' : 'Add application';

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <ToggleButtonGroup
            value={flow}
            exclusive
            onChange={(_, next: Flow | null) => next && setFlow(next)}
            fullWidth
            size="small"
          >
            <ToggleButton value="outcome" color="error">
              Outcome
            </ToggleButton>
            <ToggleButton value="income" color="success">
              Income
            </ToggleButton>
          </ToggleButtonGroup>

          {investment ? (
            <DialogContentText>
              {flow === 'income'
                ? <>Investment income from <strong>{investment.name}</strong>. This also records an income in your statement.</>
                : <>Applying to <strong>{investment.name}</strong>. This also records an outcome in your statement.</>
              }
            </DialogContentText>
          ) : (
            <TextField
              select
              label="Investment position"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              fullWidth
              autoFocus
              disabled={!positions || positions.length === 0}
              helperText={
                positions && positions.length === 0
                  ? 'No investment positions yet. Add one first.'
                  : undefined
              }
            >
              {(positions ?? []).map((pos) => (
                <MenuItem key={pos.id} value={pos.id}>
                  {pos.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Amount"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              },
            }}
            fullWidth
            autoFocus={!!investment}
          />

          <TextField
            label="Date"
            type="date"
            value={appliedAt}
            onChange={(event) => setAppliedAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
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
