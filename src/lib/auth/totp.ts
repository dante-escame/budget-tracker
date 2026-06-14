import 'server-only';

import * as OTPAuth from 'otpauth';

const TOTP_ISSUER = 'Budget Tracker';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ALGORITHM = 'SHA1';
// Accept the previous/next 30s window to tolerate clock drift.
const TOTP_VALIDATION_WINDOW = 1;
const TOTP_SECRET_BYTES = 20;

/**
 * Generate a fresh TOTP secret as a base32 string suitable for storing
 * (encrypted) and rebuilding an authenticator URI.
 */
export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: TOTP_SECRET_BYTES }).base32;
}

/**
 * Build the `otpauth://` URI used to render the enrollment QR code and the
 * manual-entry fallback. `accountLabel` is typically the user's email.
 */
export function buildOtpAuthUri(secret: string, accountLabel: string): string {
  return buildTotp(secret, accountLabel).toString();
}

/**
 * Verify a 6-digit code against the secret, allowing a ±1 step window.
 */
export function verifyTotp(secret: string, code: string): boolean {
  const normalized = code.trim();

  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  const delta = buildTotp(secret).validate({
    token: normalized,
    window: TOTP_VALIDATION_WINDOW,
  });

  return delta !== null;
}

function buildTotp(secret: string, accountLabel?: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: accountLabel ?? TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}
