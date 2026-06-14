'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { signInSchema, type SignInFields } from '@/lib/auth/schemas';

interface AuthApiResponse {
  error?: string;
  mfaRequired?: boolean;
  methodType?: 'totp' | 'email';
}

export function SignInForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email' | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFields>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(data: SignInFields) {
    setServerError(null);
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = (await response.json()) as AuthApiResponse;
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to sign in.');
      }
      if (body.mfaRequired) {
        setMfaMethod(body.methodType ?? 'totp');
        return;
      }
      window.location.href = '/dashboard';
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        {mfaMethod ? (
          <MfaChallengeView method={mfaMethod} />
        ) : (
          <Stack spacing={3}>
            <Typography variant="h5" component="h2" color="text.primary" sx={{ fontWeight: 700 }}>
              Sign in to your account
            </Typography>

            {serverError ? <Alert severity="error">{serverError}</Alert> : null}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2.5}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      autoComplete="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type="password"
                      autoComplete="current-password"
                      fullWidth
                      error={!!errors.password}
                      helperText={
                        errors.password?.message ?? 'Use the password associated with this account.'
                      }
                    />
                  )}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
                <Button
                  component={Link}
                  href="/forgot-password"
                  variant="text"
                  color="primary"
                  sx={{ alignSelf: 'flex-start', px: 0 }}
                >
                  Forgot your password?
                </Button>
              </Stack>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function MfaChallengeView({ method }: { method: 'totp' | 'email' }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function readError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { error?: string };
      return body.error ?? 'Something went wrong.';
    } catch {
      return 'Something went wrong.';
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/mfa/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error(await readError(response));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setResent(false);
    try {
      const response = await fetch('/api/auth/mfa/login/resend', { method: 'POST' });
      if (!response.ok) throw new Error(await readError(response));
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend the code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h2" color="text.primary" sx={{ fontWeight: 700 }}>
          Two-factor verification
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {method === 'email'
            ? 'Enter the 6-digit code we emailed you, or one of your backup codes.'
            : 'Enter the code from your authenticator app, or one of your backup codes.'}
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {resent ? <Alert severity="success">A new code has been sent.</Alert> : null}

      <Box component="form" onSubmit={handleVerify} noValidate>
        <Stack spacing={2.5}>
          <TextField
            label="Verification code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            fullWidth
            autoFocus
            autoComplete="one-time-code"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={submitting || code.trim().length === 0}
          >
            {submitting ? 'Verifying...' : 'Verify'}
          </Button>
          {method === 'email' ? (
            <Button
              variant="text"
              color="primary"
              onClick={() => void handleResend()}
              disabled={resending}
              sx={{ alignSelf: 'flex-start', px: 0 }}
            >
              {resending ? 'Sending...' : 'Resend code'}
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}
