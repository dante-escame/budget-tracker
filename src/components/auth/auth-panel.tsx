'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
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

import {
  forgotPasswordAction,
  signInAction,
  signUpAction,
  type AuthActionState,
} from '@/lib/auth/actions';

type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password';

const SUBMIT_LABELS = {
  sign_in: { label: 'Sign in', pendingLabel: 'Signing in...' },
  sign_up: { label: 'Create account', pendingLabel: 'Creating account...' },
  forgot_password: { label: 'Send reset link', pendingLabel: 'Sending...' },
} satisfies Record<AuthMode, { label: string; pendingLabel: string }>;

function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();
  const { label, pendingLabel } = SUBMIT_LABELS[mode];
  return (
    <Button type="submit" variant="contained" color="primary" size="large" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('sign_in');

  const [signInState, signInFormAction] = useActionState(signInAction, { status: 'idle' });
  const [signUpState, signUpFormAction] = useActionState(signUpAction, { status: 'idle' });
  const [forgotState, forgotFormAction] = useActionState(forgotPasswordAction, { status: 'idle' });

  const activeState: AuthActionState =
    mode === 'sign_in' ? signInState : mode === 'sign_up' ? signUpState : forgotState;
  const activeFormAction =
    mode === 'sign_in' ? signInFormAction : mode === 'sign_up' ? signUpFormAction : forgotFormAction;

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
            onChange={(_, nextValue: AuthMode) => setMode(nextValue)}
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

          {activeState.status !== 'idle' ? (
            <Alert severity={activeState.status === 'error' ? 'error' : 'success'}>
              <Stack spacing={1}>
                <Typography variant="body2">{activeState.message}</Typography>
                {'actionHref' in activeState && activeState.actionHref ? (
                  <Box>
                    <Button
                      component={Link}
                      href={activeState.actionHref}
                      size="small"
                      variant="outlined"
                      color="inherit"
                    >
                      {activeState.actionLabel}
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            </Alert>
          ) : null}

          <form key={mode} action={activeFormAction} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                fullWidth
              />

              {mode !== 'forgot_password' ? (
                <TextField
                  label={mode === 'sign_in' ? 'Password' : 'Create a password'}
                  name="password"
                  type="password"
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

              <SubmitButton mode={mode} />
            </Stack>
          </form>

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
