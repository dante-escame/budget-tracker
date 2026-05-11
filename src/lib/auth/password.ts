import 'server-only';

import { hash, verify } from '@node-rs/argon2';

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

// TODO AI - password policies must be configured in database and fetched for comparation here
// TODO AI - The data itself must be a field/key/value per json object, in the example, the field would be "password" the key would be "PASSWORD_MIN_LENGTH" and the value "12"(converted to integer in code).
export function assertPasswordMeetsPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error('Password must be at least 12 characters long.');
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error('Password must be 128 characters or fewer.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordMeetsPolicy(password);

  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPasswordHash(
  hashValue: string,
  password: string
): Promise<boolean> {
  return verify(hashValue, password);
}
