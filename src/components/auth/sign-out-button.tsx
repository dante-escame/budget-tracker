'use client';

import { startTransition, useState } from 'react';
import Button from '@mui/material/Button';

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  function handleSignOut() {
    startTransition(() => {
      void submitSignOut();
    });
  }

  async function submitSignOut() {
    setPending(true);

    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
    } finally {
      window.location.href = '/';
      setPending(false);
    }
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="outlined"
      color="primary"
      disabled={pending}
    >
      {pending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
