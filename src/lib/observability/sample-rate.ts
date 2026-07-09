// Shared parsing for the Sentry traces sample rate. Imported by the Node, edge
// and browser Sentry configs, so it must stay dependency-free and must NOT
// import 'server-only'.
//
// An explicit `0` disables tracing — the naive `parseFloat(x) || default` form
// treats 0 as unset and silently re-enables sampling. Invalid or out-of-range
// values fall back to the shared default, which is the same in every runtime:
// 0.2 in production, 1.0 otherwise.

export function parseSampleRate(
  raw: string | undefined,
  fallback: number
): number {
  const parsed = Number.parseFloat(raw ?? '');
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
    return parsed;
  }
  return fallback;
}

export function resolveTracesSampleRate(raw: string | undefined): number {
  return parseSampleRate(raw, process.env.NODE_ENV === 'production' ? 0.2 : 1.0);
}
