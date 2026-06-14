import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

import { authConfig } from '@/lib/auth/config';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;

function getKey(): Buffer {
  const rawKey = authConfig.mfaSecretEncryptionKey;

  if (!rawKey) {
    throw new Error('MFA_SECRET_ENCRYPTION_KEY is not configured.');
  }

  const key = Buffer.from(rawKey, 'base64');

  if (key.length !== KEY_BYTES) {
    throw new Error('MFA_SECRET_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }

  return key;
}

/**
 * Encrypt a TOTP secret with AES-256-GCM. The output packs
 * `iv:authTag:ciphertext` as base64 segments so it can be stored as one string.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a value produced by {@link encryptSecret}.
 */
export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivPart, authTagPart, ciphertextPart] = payload.split(':');

  if (!ivPart || !authTagPart || !ciphertextPart) {
    throw new Error('Malformed encrypted MFA secret.');
  }

  const iv = Buffer.from(ivPart, 'base64');
  const authTag = Buffer.from(authTagPart, 'base64');
  const ciphertext = Buffer.from(ciphertextPart, 'base64');

  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
    throw new Error('Malformed encrypted MFA secret.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}
