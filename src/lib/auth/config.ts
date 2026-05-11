import 'server-only';

function getNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

const oneDayInSeconds = getNumberEnv('AUTH_ONE_DAY_IN_SECONDS', 60 * 60 * 24);

export interface AuthConfig {
  sessionCookieName: string;
  sessionTtlSeconds: number;
  sessionFreshWindowSeconds: number;
  sessionRecentAuthWindowSeconds: number;
  emailVerificationTtlSeconds: number;
  passwordResetTtlSeconds: number;
}

export const authConfig: AuthConfig = {
  sessionCookieName: 'budget_tracker_session',
  sessionTtlSeconds: getNumberEnv('AUTH_SESSION_TTL_SECONDS', 60 * 60 * 24 * 30),
  sessionFreshWindowSeconds: getNumberEnv(
    'AUTH_SESSION_FRESH_WINDOW_SECONDS',
    oneDayInSeconds * 7
  ),
  sessionRecentAuthWindowSeconds: getNumberEnv(
    'AUTH_SESSION_RECENT_AUTH_WINDOW_SECONDS',
    60 * 15
  ),
  emailVerificationTtlSeconds: getNumberEnv(
    'AUTH_EMAIL_VERIFICATION_TTL_SECONDS',
    oneDayInSeconds
  ),
  passwordResetTtlSeconds: getNumberEnv(
    'AUTH_PASSWORD_RESET_TTL_SECONDS',
    60 * 30
  ),
};
