'use client';

import { startTransition, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password';

interface FormFeedback {
  kind: 'success' | 'error' | 'info';
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

interface AuthApiResponse {
  error?: string;
  verificationToken?: string;
  resetToken?: string;
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void submitCurrentMode();
    });
  }

  async function submitCurrentMode() {
    setPending(true);
    setFeedback(null);

    try {
      if (mode === 'sign_in') {
        const response = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const body = (await response.json()) as AuthApiResponse;
          throw new Error(body.error ?? 'Unable to sign in.');
        }

        window.location.href = '/app';
        return;
      }

      if (mode === 'sign_up') {
        const response = await fetch('/api/auth/sign-up', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        const body = (await response.json()) as AuthApiResponse;

        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to create account.');
        }

        setPassword('');
        setFeedback({
          kind: 'success',
          message: body.verificationToken
            ? 'Account created. Use the verification link below to activate access.'
            : 'Account created. Check your email to verify the address before signing in.',
          actionHref: body.verificationToken
            ? `/verify-email?token=${encodeURIComponent(body.verificationToken)}`
            : undefined,
          actionLabel: body.verificationToken ? 'Verify email now' : undefined,
        });
        setMode('sign_in');
        return;
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
            <Chip
              label="Smart Budgeting"
              color="secondary"
              sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
            />
            <Typography variant="h4" component="h2" color="text.primary">
              Understand where your money goes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track expenses, spot spending patterns, and take control of your
              finances. All your data stays private and encrypted—fully under
              your control.
            </Typography>
          </Stack>

          <Tabs
            value={mode}
            onChange={(_, nextValue: AuthMode) => {
              setMode(nextValue);
              setFeedback(null);
            }}
            variant="fullWidth"
            aria-label="Authentication modes"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 44,
                fontWeight: 600,
              },
            }}
          >
            <Tab label="Sign in" value="sign_in" />
            <Tab label="Create account" value="sign_up" />
            <Tab label="Reset access" value="forgot_password" />
          </Tabs>

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
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                fullWidth
              />

              {mode !== 'forgot_password' ? (
                <TextField
                  label={mode === 'sign_in' ? 'Password' : 'Create a password'}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === 'sign_in' ? 'current-password' : 'new-password'
                  }
                  required
                  fullWidth
                  helperText={
                    mode === 'sign_up'
                      ? 'Passwords follow the repository password policy.'
                      : 'Use the password associated with this account.'
                  }
                />
              ) : (
                <Alert severity="info">
                  Enter the email address for the account that needs a new
                  password.
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={pending}
              >
                {pending
                  ? 'Working...'
                  : mode === 'sign_in'
                    ? 'Sign in'
                    : mode === 'sign_up'
                      ? 'Create account'
                      : 'Send reset link'}
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Need to finish email verification or reset a password with a
              token?
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap',
              }}
            >
              <Button component={Link} href="/verify-email" variant="text">
                Verify email
              </Button>
              <Button component={Link} href="/reset-password" variant="text">
                Reset password
              </Button>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
