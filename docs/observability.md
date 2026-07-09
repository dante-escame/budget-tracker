# Observability & Telemetry

The app ships error monitoring + distributed tracing (Sentry SDK) and structured
JSON logging (pino), correlated by trace id. Everything is opt-in via env: with
`SENTRY_DSN` unset, Sentry is a no-op and the app runs normally.

## Pieces

| Concern            | Where                                                        |
| ------------------ | ------------------------------------------------------------ |
| Sentry init        | `instrumentation.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` |
| Request errors     | `onRequestError` in `instrumentation.ts` (route handlers + Server Components) |
| Error UI           | `src/app/error.tsx`, `src/app/global-error.tsx`              |
| Service telemetry  | `src/lib/observability/instrument.ts` applied in each `src/lib/<domain>/runtime.ts` |
| Structured logging | `src/lib/observability/logger.ts` (pino)                     |
| Sample-rate parsing| `src/lib/observability/sample-rate.ts` (shared by all runtimes) |
| DB spans           | command monitoring in `src/lib/mongodb.ts`                   |
| Build integration  | `withSentryConfig` in `next.config.ts`                       |
| Backend            | `infra/observability/docker-compose.yml` (GlitchTip)         |

## Environment variables

Server (add to `.env.local`):

```bash
SENTRY_DSN=                 # from your GlitchTip/Sentry project; unset = telemetry off
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0   # 0..1; defaults 1.0 dev / 0.2 prod; explicit 0 disables tracing
LOG_LEVEL=debug             # pino level; defaults debug (dev) / info (prod)
```

The sample rate is parsed by `src/lib/observability/sample-rate.ts`, shared by
the Node, edge and browser configs so all runtimes use the same defaults and an
explicit `0` always means "tracing off".

Optional, only for source-map upload at build time: `SENTRY_ORG`,
`SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_URL` (self-hosted base URL).

Client (optional, browser telemetry): `NEXT_PUBLIC_SENTRY_DSN`,
`NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`.

## Running the backend

```bash
cp infra/observability/.env.example infra/observability/.env   # edit SECRET_KEY
docker compose -f infra/observability/docker-compose.yml --env-file infra/observability/.env up -d
```

Open http://localhost:8000, register (first user is admin), create an org +
project, copy the project DSN into `SENTRY_DSN`.

## How instrumentation works

Each domain's service is built in `src/lib/<domain>/runtime.ts` and wrapped with
`instrument()`. That wrapper, for every service method call:

- opens a Sentry span `<domain>.<method>` nested in the request's trace;
- logs `start` / `success` / `error` with `durationMs`, `flow`, `traceId`
  (plus `userId` when the domain opts in — see below);
- reports thrown errors to Sentry and re-throws them unchanged.

Errors that extend `ExpectedDomainError` (`src/lib/errors.ts`) — invalid
credentials, empty import files, and other user-facing outcomes the API routes
already map to 4xx — are logged at `warn` and never sent to Sentry. Make new
"expected" service errors extend that class instead of `Error`.

MongoDB command monitoring (enabled when `SENTRY_DSN` is set) adds a `db` span
per DB command while a trace is active, so a trace shows service method → DB
operation with durations.

### Adding telemetry to a new domain

Wrap the service where it is created — one line:

```ts
import { instrument } from '@/lib/observability/instrument';

// ...
return instrument(createFooService(repository), { domain: 'foo', userIdArg: 0 });
```

`userIdArg` names the argument position that carries the user id on **every**
method of the service (0 for the domains whose methods all take `userId`
first). Omit it when that doesn't hold — auth omits it because its methods
receive tokens and MFA codes as their first argument, and those must never be
logged as `userId`. User ids are never inferred from argument shape.

That covers both API route handlers and Server Components (they both call the
service), including reads that never touch an API route.

## Logging

Use the shared logger instead of `console.*`:

```ts
import { logger } from '@/lib/observability/logger';

const log = logger.child({ module: 'my-thing' });
log.info({ someId }, 'did the thing');
log.error({ err }, 'it failed');
```

JSON in production (collected from stdout by the container/host); pretty-printed
in development.

Sensitive keys (`password`, `token`, `mfaCode`, `backupCodes`, `csvText`,
`authorization`, and their nested forms) are redacted automatically — never log
whole request bodies or raw statement/bill CSV contents.

Two rules that keep redaction honest:

- **MFA codes go under `mfaCode`, never `code`.** A generic `code` redact path
  would also delete diagnostic codes like `err.code` (`ECONNREFUSED`, HTTP
  statuses) that failure triage depends on, so only `mfaCode` is redacted.
- **Secrets never go in the message string.** Redaction only sees structured
  fields; interpolating a token into the message bypasses it. The one sanctioned
  exemption is the dev-only mail fallback in `src/lib/mailer.ts`
  (`printDevMailFallback`), which intentionally uses `console.log` so
  verification links / MFA codes always print in development without a mail
  provider, regardless of `LOG_LEVEL`.
