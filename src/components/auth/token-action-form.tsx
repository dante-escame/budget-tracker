'use client';

import { startTransition, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

type TokenActionKind = 'verify_email' | 'reset_password';

interface TokenActionFormProps {
  kind: TokenActionKind;
}

interface AuthApiResponse {
  error?: string;
}

export function TokenActionForm({ kind }: TokenActionFormProps) {
  const searchParams = useSearchParams();
  const searchToken = searchParams.get('token') ?? '';
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void submitTokenAction();
    });
  }

  async function submitTokenAction() {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(
        kind === 'verify_email'
          ? '/api/auth/verify-email'
          : '/api/auth/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            kind === 'verify_email'
              ? { token: token || searchToken }
              : { token: token || searchToken, password }
          ),
        }
      );
      const body = (await response.json()) as AuthApiResponse;

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to complete this action.');
      }

      setFeedback({
        kind: 'success',
        message:
          kind === 'verify_email'
            ? 'Email verified. You can now sign in from the main screen.'
            : 'Password updated. Return to the main screen and sign in with the new password.',
      });

      if (kind === 'reset_password') {
        setPassword('');
      }
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setPending(false);
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
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" component="h1" color="text.primary">
              {kind === 'verify_email' ? 'Verify your email' : 'Reset password'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {kind === 'verify_email'
                ? 'Paste the email verification token to activate this account.'
                : 'Paste the password reset token and choose a new password.'}
            </Typography>
          </Stack>

          {feedback ? (
            <Alert severity={feedback.kind}>{feedback.message}</Alert>
          ) : null}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Token"
                value={token || searchToken}
                onChange={(event) => setToken(event.target.value)}
                required
                fullWidth
              />

              {kind === 'reset_password' ? (
                <TextField
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  fullWidth
                />
              ) : null}

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={pending}
              >
                {pending
                  ? 'Working...'
                  : kind === 'verify_email'
                    ? 'Verify email'
                    : 'Update password'}
              </Button>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button component={Link} href="/" variant="text">
              Back to sign in
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
