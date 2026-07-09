// Sentry initialization for the Node.js server runtime. Loaded from
// `instrumentation.ts` when `NEXT_RUNTIME === 'nodejs'`. When `SENTRY_DSN` is
// unset, `Sentry.init` is a no-op, so the app runs normally without a backend.
import * as Sentry from '@sentry/nextjs';

import { resolveTracesSampleRate } from '@/lib/observability/sample-rate';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: resolveTracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
  // Never attach cookies/headers/IPs or other request PII to events.
  sendDefaultPii: false,
});
