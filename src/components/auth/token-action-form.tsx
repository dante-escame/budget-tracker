'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
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
import { resetPasswordSchema, verifyEmailSchema } from '@/lib/auth/schemas';

type TokenActionKind = 'verify_email' | 'reset_password';

interface TokenActionFormProps {
  kind: TokenActionKind;
}

interface AuthApiResponse {
  error?: string;
}

// Union of both possible shapes; resolver enforces the right schema per `kind`.
interface TokenFormValues {
  token: string;
  password: string;
}

export function TokenActionForm({ kind }: TokenActionFormProps) {
  const searchParams = useSearchParams();
  const searchToken = searchParams.get('token') ?? '';
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const schema = kind === 'verify_email' ? verifyEmailSchema : resetPasswordSchema;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TokenFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<TokenFormValues>,
    defaultValues: { token: searchToken, password: '' },
  });

  async function onSubmit(data: TokenFormValues) {
    setFeedback(null);
    try {
      const endpoint =
        kind === 'verify_email' ? '/api/auth/verify-email' : '/api/auth/reset-password';
      const body =
        kind === 'verify_email' ? { token: data.token } : { token: data.token, password: data.password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const responseBody = ((await response.json().catch(() => null)) ??
        {}) as AuthApiResponse;

      if (!response.ok) {
        throw new Error(responseBody.error ?? 'Unable to complete this action.');
      }

      setFeedback({
        kind: 'success',
        message:
          kind === 'verify_email'
            ? 'Email verified. You can now sign in from the main screen.'
            : 'Password updated. Return to the main screen and sign in with the new password.',
      });

      if (kind === 'reset_password') {
        reset({ token: data.token, password: '' });
      }
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
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

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <Controller
                name="token"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Token"
                    fullWidth
                    error={!!errors.token}
                    helperText={errors.token?.message}
                  />
                )}
              />

              {kind === 'reset_password' ? (
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      fullWidth
                      error={!!errors.password}
                      helperText={errors.password?.message}
                    />
                  )}
                />
              ) : null}

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting}
              >
                {isSubmitting
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
