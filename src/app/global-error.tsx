'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Top-level error boundary that catches errors in the root layout itself. It
// replaces the whole document, so it must render its own <html>/<body> and can't
// rely on the MUI theme provider — inline styles keep it self-contained.
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#FAFBE9',
          color: '#2E3A2E',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#4F5D4F', marginBottom: 24 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#88C9A1',
              color: '#2E3A2E',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
