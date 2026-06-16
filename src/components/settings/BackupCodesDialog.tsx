'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Something went wrong.';
  } catch {
    return 'Something went wrong.';
  }
}

export function BackupCodesDialog({
  open,
  codes,
  onClose,
}: {
  open: boolean;
  codes: string[] | null;
  onClose: () => void;
}) {
  const [currentCodes, setCurrentCodes] = useState<string[] | null>(codes);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync when reopened with a fresh set (e.g. just-enrolled codes).
  useEffect(() => {
    if (open) {
      setCurrentCodes(codes);
      setError(null);
      setCopied(false);
    }
  }, [open, codes]);

  async function handleRegenerate(): Promise<void> {
    setRegenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/mfa/backup-codes/regenerate', {
        method: 'POST',
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as { backupCodes: string[] };
      setCurrentCodes(body.backupCodes);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to regenerate codes.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (!currentCodes) return;
    try {
      await navigator.clipboard.writeText(currentCodes.join('\n'));
      setCopied(true);
    } catch {
      setError('Unable to copy to clipboard.');
    }
  }

  function handleDownload(): void {
    if (!currentCodes) return;
    const blob = new Blob([`${currentCodes.join('\n')}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'budget-tracker-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Backup codes</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Alert severity="warning">
            Save these codes somewhere safe. Each code works once, and they replace any previous
            codes. You won&apos;t be able to see them again.
          </Alert>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {currentCodes ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                fontFamily: 'monospace',
                fontSize: 15,
              }}
            >
              {currentCodes.map((code) => (
                <Typography key={code} sx={{ fontFamily: 'monospace' }}>
                  {code}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Generate a fresh set of backup codes. This immediately invalidates any codes you
              saved before.
            </Typography>
          )}

          {currentCodes ? (
            <Stack direction="row" spacing={1}>
              <Button onClick={() => void handleCopy()} variant="outlined" size="small">
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button onClick={handleDownload} variant="outlined" size="small">
                Download
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void handleRegenerate()} disabled={regenerating} color="inherit">
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
