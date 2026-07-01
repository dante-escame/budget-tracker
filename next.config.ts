import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: '.',
  },
};

// `withSentryConfig` adds source-map upload and tunneling. Org/project/auth are
// only needed for source-map upload at build time (via SENTRY_ORG,
// SENTRY_PROJECT, SENTRY_AUTH_TOKEN); without them the build still succeeds and
// simply skips the upload.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Self-hosted backends (GlitchTip / self-hosted Sentry) accept the same OTLP/
  // envelope endpoints; point the CLI at them for source-map upload if used.
  sentryUrl: process.env.SENTRY_URL,
});
