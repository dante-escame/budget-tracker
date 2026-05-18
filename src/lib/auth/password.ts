import 'server-only';

import { hash, verify } from '@node-rs/argon2';
import { getPasswordPolicy } from '@/lib/auth/settings';

export async function assertPasswordMeetsPolicy(password: string): Promise<void> {
  const policy = await getPasswordPolicy();

  if (password.length < policy.minLength) {
    throw new Error(
      `Password must be at least ${policy.minLength} characters long.`
    );
  }

  if (password.length > policy.maxLength) {
    throw new Error(
      `Password must be ${policy.maxLength} characters or fewer.`
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  await assertPasswordMeetsPolicy(password);

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
