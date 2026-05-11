import 'server-only';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24; // TODO AI - this has to be configurable, the default value should be the current one

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
  sessionTtlSeconds: 60 * 60 * 24 * 30,
  sessionFreshWindowSeconds: ONE_DAY_IN_SECONDS * 7,
  sessionRecentAuthWindowSeconds: 60 * 15,
  emailVerificationTtlSeconds: ONE_DAY_IN_SECONDS,
  passwordResetTtlSeconds: 60 * 30,
};
