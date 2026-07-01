// Sentry initialization for the Node.js server runtime. Loaded from
// `instrumentation.ts` when `NEXT_RUNTIME === 'nodejs'`. When `SENTRY_DSN` is
// unset, `Sentry.init` is a no-op, so the app runs normally without a backend.
import * as Sentry from '@sentry/nextjs';

function tracesSampleRate(): number {
  const parsed = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '');
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
    return parsed;
  }
  return process.env.NODE_ENV === 'production' ? 0.2 : 1.0;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: tracesSampleRate(),
  // Never attach cookies/headers/IPs or other request PII to events.
  sendDefaultPii: false,
});
