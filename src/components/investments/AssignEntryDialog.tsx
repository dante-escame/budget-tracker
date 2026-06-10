'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import type { Investment } from '@/lib/investments';

export function AssignEntryDialog({
  open,
  entryId,
  entryDescription,
  positions,
  onClose,
  onSaved,
}: {
  open: boolean;
  entryId: string;
  entryDescription: string;
  positions: Investment.PositionRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedId) {
      setError('Select an investment position.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/investments/${selectedId}/applications/from-entry`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId }),
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
      <DialogTitle>Assign to investment</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <DialogContentText>
            Assigning: <strong>{entryDescription}</strong>
          </DialogContentText>

          <TextField
            select
            label="Investment position"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            fullWidth
            autoFocus
            disabled={positions.length === 0}
            helperText={
              positions.length === 0
                ? 'No investment positions yet. Add one first.'
                : undefined
            }
          >
            {positions.map((position) => (
              <MenuItem key={position.id} value={position.id}>
                {position.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={pending || positions.length === 0}
        >
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}
