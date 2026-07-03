import 'server-only';

import * as Sentry from '@sentry/nextjs';

import { logger } from '@/lib/observability/logger';

// A generic telemetry wrapper for the domain service objects. Every method is
// wrapped so each call:
//   - runs inside a Sentry span named `<domain>.<method>` (a child of the active
//     request span, so it appears in the request's distributed trace),
//   - emits structured start/success/error logs with duration, correlated to the
//     trace via `traceId`,
//   - reports thrown errors to Sentry before re-throwing.
//
// It is side-effect only: return values, thrown error types and control flow are
// never altered. Apply it in each domain's `runtime.ts` when building the service.

/** Returns the id of the currently active trace, if any, for log↔trace correlation. */
export function getTraceId(): string | undefined {
  const span = Sentry.getActiveSpan();
  if (span) {
    return Sentry.spanToJSON(span).trace_id;
  }

  try {
    return Sentry.getCurrentScope().getPropagationContext().traceId;
  } catch {
    return undefined;
  }
}

/**
 * User ids are only logged when a domain explicitly opts in via `userIdArg`,
 * naming which argument position carries the user id. Never inferred from
 * argument shape: domains like auth pass secrets (tokens, MFA codes) as their
 * first argument, and guessing would write those to logs under `userId`.
 */
export function userIdFromArgs(
  args: unknown[],
  userIdArg: number | undefined
): string | undefined {
  if (userIdArg === undefined) {
    return undefined;
  }
  const value = args[userIdArg];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

function toErrorInfo(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'UnknownError', message: String(error) };
}

/**
 * Next.js signals control flow (redirect/notFound, dynamic-render bailout,
 * bail-to-client) by throwing special errors that propagate up like exceptions.
 * These are not failures, so we must not report them to Sentry or log them as
 * errors — otherwise every `redirect()`/`notFound()`/dynamic route would create
 * false error events. They still re-throw so the framework handles them.
 */
function isFrameworkControlFlow(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const digest = (error as { digest?: unknown }).digest;
  if (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') ||
      digest === 'NEXT_NOT_FOUND' ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK') ||
      digest === 'DYNAMIC_SERVER_USAGE' ||
      digest === 'BAILOUT_TO_CLIENT_SIDE_RENDERING')
  ) {
    return true;
  }

  const name = (error as { name?: unknown }).name;
  return name === 'DynamicServerError' || name === 'BailoutToCSRError';
}

function runInstrumented(
  domain: string,
  method: string,
  userIdArg: number | undefined,
  fn: (...args: unknown[]) => unknown,
  thisArg: unknown,
  args: unknown[]
): unknown {
  const flow = `${domain}.${method}`;
  const log = logger.child({
    flow,
    userId: userIdFromArgs(args, userIdArg),
    traceId: getTraceId(),
  });
  const startedAt = performance.now();
  log.debug({ event: 'start' }, `${flow} started`);

  const durationMs = () => Math.round(performance.now() - startedAt);

  const onSuccess = () => {
    log.info({ event: 'success', durationMs: durationMs() }, `${flow} succeeded`);
  };

  const onError = (error: unknown) => {
    if (isFrameworkControlFlow(error)) {
      log.debug({ event: 'bailout', durationMs: durationMs() }, `${flow} bailed out`);
      return;
    }
    Sentry.captureException(error);
    log.error(
      { event: 'error', durationMs: durationMs(), err: toErrorInfo(error) },
      `${flow} failed`
    );
  };

  return Sentry.startSpan({ name: flow, op: 'service' }, () => {
    try {
      const result = fn.apply(thisArg, args);

      if (isThenable(result)) {
        return result.then(
          (value) => {
            onSuccess();
            return value;
          },
          (error) => {
            onError(error);
            throw error;
          }
        );
      }

      onSuccess();
      return result;
    } catch (error) {
      onError(error);
      throw error;
    }
  });
}

/**
 * Wraps every function-valued property of `service` with telemetry. Non-function
 * properties are passed through untouched. The returned object keeps the same
 * type, so callers are unaffected.
 *
 * `userIdArg` opts the domain into user-id logging by naming the argument
 * position that carries the user id on every method (0 for the domains whose
 * methods all take `userId` first). Omit it for domains where that doesn't hold
 * — e.g. auth, whose methods receive tokens/codes first — so secrets can never
 * be logged as `userId`.
 */
export function instrument<T extends object>(
  service: T,
  options: { domain: string; userIdArg?: number }
): T {
  const { domain, userIdArg } = options;
  const wrapped: Record<string, unknown> = {};

  for (const key of Object.keys(service) as (keyof T & string)[]) {
    const value = service[key];

    if (typeof value !== 'function') {
      wrapped[key] = value;
      continue;
    }

    const method = value as (...args: unknown[]) => unknown;
    wrapped[key] = (...args: unknown[]) =>
      runInstrumented(domain, key, userIdArg, method, service, args);
  }

  return wrapped as T;
}
