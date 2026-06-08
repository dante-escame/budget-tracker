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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import type { Investment } from '@/lib/investments';
import { reaisToCentavos } from '@/components/investments/format';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ApplicationFormDialog({
  open,
  investment,
  onClose,
  onSaved,
}: {
  open: boolean;
  investment: Investment.PositionRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Seeded on mount; the parent remounts this dialog (changing `key`) on each
  // open, which resets the fields.
  const [value, setValue] = useState('');
  const [appliedAt, setAppliedAt] = useState(today());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!investment) return;

    const centavos = reaisToCentavos(value);
    if (centavos === null || centavos <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/investments/${investment.id}/applications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: centavos, appliedAt }),
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

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>Add application</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {investment && (
            <DialogContentText>
              Applying to <strong>{investment.name}</strong>. This also records an
              outcome in your statement.
            </DialogContentText>
          )}

          <TextField
            label="Amount"
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              },
            }}
            fullWidth
            autoFocus
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
