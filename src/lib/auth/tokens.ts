import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

const SESSION_TOKEN_BYTES = 32;
const USER_TOKEN_BYTES = 32;

export interface TokenMaterial {
  token: string;
  tokenHash: string;
}

export function createSessionTokenMaterial(): TokenMaterial {
  return createTokenMaterial(SESSION_TOKEN_BYTES);
}

export function createUserTokenMaterial(): TokenMaterial {
  return createTokenMaterial(USER_TOKEN_BYTES);
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashIpAddress(ipAddress: string): string {
  return createHash('sha256').update(ipAddress).digest('hex');
}

function createTokenMaterial(size: number): TokenMaterial {
  const token = randomBytes(size).toString('base64url');

  return {
    token,
    tokenHash: hashOpaqueToken(token),
  };
}
