'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
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

import type { Auth } from '@/lib/auth';

interface EnrollStartResponse {
  type: Auth.MfaMethodType;
  secret?: string;
  otpauthUri?: string;
  qrDataUrl?: string | null;
  error?: string;
}

const TITLES: Record<Auth.MfaMethodType, string> = {
  totp: 'Set up authenticator app',
  email: 'Set up email code',
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Something went wrong.';
  } catch {
    return 'Something went wrong.';
  }
}

export function EnrollMethodDialog({
  type,
  onClose,
  onEnrolled,
}: {
  type: Auth.MfaMethodType;
  onClose: () => void;
  onEnrolled: (backupCodes: string[]) => void;
}) {
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function start(): Promise<void> {
    setStarting(true);
    setStartError(null);
    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as EnrollStartResponse;
      setSecret(body.secret ?? null);
      setQrDataUrl(body.qrDataUrl ?? null);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Unable to start setup.');
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    void start();
    // Enrollment is started once when the dialog mounts for a given method.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResend(): Promise<void> {
    setResending(true);
    setConfirmError(null);
    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) throw new Error(await readError(response));
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Unable to resend the code.');
    } finally {
      setResending(false);
    }
  }

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    setConfirmError(null);
    try {
      const response = await fetch('/api/auth/mfa/enroll/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, code }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as { backupCodes: string[] };
      onEnrolled(body.backupCodes);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Unable to verify the code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{TITLES[type]}</DialogTitle>
      <DialogContent>
        {starting ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : startError ? (
          <Alert severity="error">{startError}</Alert>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {type === 'totp' ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Scan this QR code with your authenticator app, then enter the 6-digit code it
                  shows.
                </Typography>
                {qrDataUrl ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Image
                      src={qrDataUrl}
                      alt="Authenticator QR code"
                      width={200}
                      height={200}
                      unoptimized
                      style={{ borderRadius: 8 }}
                    />
                  </Box>
                ) : null}
                {secret ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Can&apos;t scan? Enter this key manually:
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        fontSize: 14,
                        mt: 0.5,
                      }}
                    >
                      {secret}
                    </Typography>
                  </Box>
                ) : null}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                We sent a 6-digit code to your email address. Enter it below to finish setup.
              </Typography>
            )}

            <TextField
              label="Verification code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              fullWidth
              autoFocus
              inputMode="numeric"
              slotProps={{ htmlInput: { maxLength: 6 } }}
            />

            {type === 'email' ? (
              <Button
                onClick={() => void handleResend()}
                disabled={resending}
                size="small"
                sx={{ alignSelf: 'flex-start', px: 0 }}
              >
                {resending ? 'Sending…' : 'Resend code'}
              </Button>
            ) : null}

            {confirmError ? <Alert severity="error">{confirmError}</Alert> : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleConfirm()}
          disabled={submitting || starting || !!startError || code.trim().length === 0}
        >
          {submitting ? 'Verifying…' : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
