import 'server-only';

import { randomBytes, randomInt } from 'node:crypto';

const OTP_DIGITS = 6;
// Backup codes are two groups of 4 lowercase hex chars, e.g. "a1b2-c3d4".
const BACKUP_CODE_GROUP_BYTES = 2;

/**
 * Generate a numeric one-time code (zero-padded) for email OTP challenges.
 */
export function generateNumericOtp(): string {
  const max = 10 ** OTP_DIGITS;

  return randomInt(0, max).toString().padStart(OTP_DIGITS, '0');
}

/**
 * Generate `count` formatted single-use backup codes (e.g. "a1b2-c3d4").
 */
export function generateBackupCodes(count: number): string[] {
  return Array.from({ length: count }, () => formatBackupCode());
}

/**
 * Normalize a user-entered backup code for hashing/comparison: lowercase and
 * strip surrounding whitespace, tolerating an omitted separator.
 */
export function normalizeBackupCode(code: string): string {
  const compact = code.trim().toLowerCase().replace(/\s+/g, '');

  if (/^[0-9a-f]{8}$/.test(compact)) {
    return `${compact.slice(0, 4)}-${compact.slice(4)}`;
  }

  return compact;
}

function formatBackupCode(): string {
  const left = randomBytes(BACKUP_CODE_GROUP_BYTES).toString('hex');
  const right = randomBytes(BACKUP_CODE_GROUP_BYTES).toString('hex');

  return `${left}-${right}`;
}
