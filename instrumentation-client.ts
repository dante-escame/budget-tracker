// Sentry initialization for the browser. Next.js 15.3+/16 loads this file
// automatically on the client. With `SENTRY_DSN` unset it is a no-op.
import * as Sentry from '@sentry/nextjs';

import { resolveTracesSampleRate } from '@/lib/observability/sample-rate';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: resolveTracesSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
  ),
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
