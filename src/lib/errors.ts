/**
 * Base class for errors that represent expected, user-facing outcomes (wrong
 * password, unverified email, empty import file, …). API routes map them to
 * 4xx responses, and telemetry treats them as warnings rather than failures:
 * `instrument()` logs them at warn level and never reports them to Sentry, so
 * error monitoring stays focused on real defects.
 */
export class ExpectedDomainError extends Error {}

export function isExpectedDomainError(
  error: unknown
): error is ExpectedDomainError {
  return error instanceof ExpectedDomainError;
}
