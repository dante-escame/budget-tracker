import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: '.',
  },
  // pino's worker-thread transport (pino-pretty via thread-stream) resolves
  // modules at runtime in ways the bundler can't trace; keep the packages
  // external so dev logging can't break startup.
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
};

// `withSentryConfig` adds source-map upload and tunneling. Org/project/auth are
// only needed for source-map upload at build time (via SENTRY_ORG,
// SENTRY_PROJECT, SENTRY_AUTH_TOKEN); without them the build still succeeds and
// simply skips the upload.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // The plugin does not read SENTRY_AUTH_TOKEN implicitly — it must be passed.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Self-hosted backends (GlitchTip / self-hosted Sentry) accept the same OTLP/
  // envelope endpoints; point the CLI at them for source-map upload if used.
  sentryUrl: process.env.SENTRY_URL,
});
