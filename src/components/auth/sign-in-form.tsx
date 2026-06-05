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
}

export function SignInForm() {
  const [serverError, setServerError] = useState<string | null>(null);
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
      if (!response.ok) {
        const body = (await response.json()) as AuthApiResponse;
        throw new Error(body.error ?? 'Unable to sign in.');
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
      </CardContent>
    </Card>
  );
}
