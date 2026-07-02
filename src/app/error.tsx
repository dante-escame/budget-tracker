'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// Route-segment error boundary. Reports the error to Sentry and offers a retry.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          textAlign: 'center',
          maxWidth: 420,
        }}
      >
        <Typography variant="h5" component="h1">
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary">
          An unexpected error occurred. You can try again, and we&apos;ve been
          notified.
        </Typography>
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Box>
    </Box>
  );
}
