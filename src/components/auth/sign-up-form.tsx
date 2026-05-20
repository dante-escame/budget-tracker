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
  verificationToken?: string;
}

interface Feedback {
  kind: 'success' | 'error';
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          <Typography variant="h5" component="h2" color="text.primary" sx={{ fontWeight: 700 }}>
            Create your account
          </Typography>

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
                {feedback.kind === 'success' ? (
                  <Box>
                    <Button
                      component={Link}
                      href="/sign-in"
                      size="small"
                      variant="outlined"
                      color="inherit"
                    >
                      Go to sign in
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
              <TextField
                label="Create a password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                fullWidth
                helperText="Passwords follow the repository password policy."
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={pending}
              >
                {pending ? 'Creating account...' : 'Create account'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
