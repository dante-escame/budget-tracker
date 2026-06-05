'use client';

import { useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

import type { Entry } from '@/lib/entries';

type Status = 'idle' | 'uploading' | 'done' | 'error';

export function ImportStatementDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [summary, setSummary] = useState<Entry.ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setStatus('idle');
    setSummary(null);
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleClose() {
    if (status === 'uploading') return;
    reset();
    onClose();
  }

  async function handleImport() {
    if (!file) return;

    setStatus('uploading');
    setErrorMessage(null);
    setSummary(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/entries/import', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) ||
          'Import failed. Please try again.';
        setErrorMessage(message);
        setStatus('error');
        return;
      }

      setSummary(payload as Entry.ImportSummary);
      setStatus('done');
      onImported();
    } catch {
      setErrorMessage('Could not reach the server. Please try again.');
      setStatus('error');
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Import bank statement</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Upload a CSV bank statement. Rows already imported are skipped, so it is
            safe to re-import the same file.
          </Typography>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setStatus('idle');
              setSummary(null);
              setErrorMessage(null);
            }}
          />

          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: 'background.default',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <DescriptionRoundedIcon sx={{ color: 'primary.dark', mb: 1 }} />
            <Typography variant="body2" color="text.primary">
              {file ? file.name : 'Click to choose a .csv file'}
            </Typography>
          </Box>

          {status === 'done' && summary && <ImportResult summary={summary} />}

          {status === 'error' && errorMessage && (
            <Alert severity="error">{errorMessage}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={status === 'uploading'} color="inherit">
          {status === 'done' ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!file || status === 'uploading' || status === 'done'}
          startIcon={
            status === 'uploading' ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {status === 'uploading' ? 'Importing…' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ImportResult({ summary }: { summary: Entry.ImportSummary }) {
  const hasErrors = summary.errors.length > 0;

  return (
    <Stack spacing={1}>
      <Alert severity={summary.inserted > 0 ? 'success' : 'info'}>
        Imported {summary.inserted} new{' '}
        {summary.inserted === 1 ? 'entry' : 'entries'}, skipped {summary.skipped}{' '}
        already present (of {summary.total} rows).
      </Alert>
      {hasErrors && (
        <Alert severity="warning">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {summary.errors.length} row(s) could not be imported:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {summary.errors.slice(0, 5).map((error) => (
              <li key={error.line}>
                Line {error.line}: {error.message}
              </li>
            ))}
            {summary.errors.length > 5 && (
              <li>…and {summary.errors.length - 5} more.</li>
            )}
          </Box>
        </Alert>
      )}
    </Stack>
  );
}
