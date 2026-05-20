'use client';

import { startTransition, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface AuthApiResponse {
  error?: string;
  resetToken?: string;
}

interface Feedback {
  kind: 'success' | 'error';
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      void submit();
    });
  }

  async function submit() {
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as AuthApiResponse;
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to request a reset link.');
      }
      setFeedback({
        kind: 'success',
        message: body.resetToken
          ? 'Password reset token created for this account.'
          : 'If the account exists, a password reset message can now be delivered.',
        actionHref: body.resetToken
          ? `/reset-password?token=${encodeURIComponent(body.resetToken)}`
          : undefined,
        actionLabel: body.resetToken ? 'Reset password now' : undefined,
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
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
          <Stack spacing={0.5}>
            <Typography variant="h5" component="h2" color="text.primary" sx={{ fontWeight: 700 }}>
              Reset password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter the email address for the account that needs a new password.
            </Typography>
          </Stack>

          {feedback ? (
            <Alert severity={feedback.kind}>
              <Stack spacing={1}>
                <Typography variant="body2">{feedback.message}</Typography>
                {feedback.actionHref && feedback.actionLabel ? (
                  <Box>
                    <Button
                      component={Link}
                      href={feedback.actionHref}
                      size="small"
                      variant="outlined"
                      color="inherit"
                    >
                      {feedback.actionLabel}
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            </Alert>
          ) : null}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={pending}
              >
                {pending ? 'Sending...' : 'Send reset link'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
