'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export function LandingActions() {
  return (
    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
      <Button
        component={Link}
        href="/sign-up"
        variant="contained"
        color="primary"
        size="large"
      >
        Get started now!
      </Button>
      <Button
        component={Link}
        href="/sign-in"
        variant="outlined"
        color="primary"
        size="large"
      >
        Sign In
      </Button>
    </Stack>
  );
}
