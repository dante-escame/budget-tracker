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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

import { parseCreditCardCsv } from '@/lib/credit-cards/csv';
import type { CreditCard } from '@/lib/credit-cards';

type Status = 'idle' | 'uploading' | 'done' | 'error';

export function ImportCreditCardDialog({
  open,
  defaultCardLabel,
  onClose,
  onImported,
}: {
  open: boolean;
  defaultCardLabel: string | null;
  onClose: () => void;
  onImported: (summary: CreditCard.ImportSummary) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cardLabel, setCardLabel] = useState(defaultCardLabel ?? '');
  const [billMonth, setBillMonth] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [summary, setSummary] = useState<CreditCard.ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setBillMonth('');
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

  async function handleFileChange(selected: File | null) {
    setFile(selected);
    setStatus('idle');
    setSummary(null);
    setErrorMessage(null);

    // Pre-fill the bill month from the latest transaction date in the file.
    if (selected) {
      try {
        const text = await selected.text();
        const guessed = guessBillMonth(text);
        if (guessed) setBillMonth(guessed);
      } catch {
        // Ignore — the user can pick the month manually.
      }
    }
  }

  async function handleImport() {
    if (!file || !cardLabel.trim() || !billMonth) return;

    setStatus('uploading');
    setErrorMessage(null);
    setSummary(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('cardLabel', cardLabel.trim());
    formData.append('billMonth', billMonth);

    try {
      const response = await fetch('/api/credit-cards/import', {
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

      const result = payload as CreditCard.ImportSummary;
      setSummary(result);
      setStatus('done');
      onImported(result);
    } catch {
      setErrorMessage('Could not reach the server. Please try again.');
      setStatus('error');
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Import credit-card bill</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Upload a fatura CSV. Lines already imported are skipped, so it is safe to
            re-import an updated bill.
          </Typography>

          <TextField
            label="Card"
            placeholder="e.g. Nubank"
            size="small"
            value={cardLabel}
            onChange={(event) => setCardLabel(event.target.value)}
            disabled={status === 'uploading'}
            fullWidth
          />

          <TextField
            label="Bill month"
            type="month"
            size="small"
            value={billMonth}
            onChange={(event) => setBillMonth(event.target.value)}
            disabled={status === 'uploading'}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="Pre-filled from the file's latest transaction; adjust if needed."
            fullWidth
          />

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
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
          disabled={
            !file ||
            !cardLabel.trim() ||
            !billMonth ||
            status === 'uploading' ||
            status === 'done'
          }
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

function ImportResult({ summary }: { summary: CreditCard.ImportSummary }) {
  const total = summary.inserted + summary.skipped + summary.errors.length;
  const hasErrors = summary.errors.length > 0;

  return (
    <Stack spacing={1}>
      <Alert severity={summary.inserted > 0 ? 'success' : 'info'}>
        Imported {summary.inserted} new{' '}
        {summary.inserted === 1 ? 'line' : 'lines'}, skipped {summary.skipped}{' '}
        already present (of {total} rows).
      </Alert>
      {summary.suggestedPayment && (
        <Alert severity="info">
          A matching statement payment was found. Use “Link payment” on the bill to
          confirm it and mark the bill as paid.
        </Alert>
      )}
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

/** Latest transaction month in the file as `YYYY-MM`, or null when unknown. */
function guessBillMonth(csvText: string): string | null {
  const rows = parseCreditCardCsv(csvText);
  let latest: string | null = null;
  for (const row of rows) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      if (!latest || row.date > latest) latest = row.date;
    }
  }
  return latest ? latest.slice(0, 7) : null;
}
