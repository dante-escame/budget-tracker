// Sentry initialization for the Edge runtime. Loaded from `instrumentation.ts`
// when `NEXT_RUNTIME === 'edge'`. The app currently runs everything on the Node
// runtime, but this keeps middleware/edge routes covered if any are ever added.
import * as Sentry from '@sentry/nextjs';

import { resolveTracesSampleRate } from '@/lib/observability/sample-rate';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: resolveTracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
  sendDefaultPii: false,
});
