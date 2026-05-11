import 'server-only';

import { getAuthCollections } from '@/lib/auth/mongodb-collections';

const PASSWORD_POLICY_FIELD = 'password';
const PASSWORD_MIN_LENGTH_KEY = 'PASSWORD_MIN_LENGTH';
const PASSWORD_MAX_LENGTH_KEY = 'PASSWORD_MAX_LENGTH';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
}

const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
};

export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  const collections = await getAuthCollections();
  const settings = await collections.authSettings
    .find({
      field: PASSWORD_POLICY_FIELD,
      key: {
        $in: [PASSWORD_MIN_LENGTH_KEY, PASSWORD_MAX_LENGTH_KEY],
      },
    })
    .toArray();

  const values = new Map(settings.map((setting) => [setting.key, setting.value]));

  const minLength = parsePositiveIntegerSetting(
    values.get(PASSWORD_MIN_LENGTH_KEY),
    defaultPasswordPolicy.minLength
  );
  const maxLength = parsePositiveIntegerSetting(
    values.get(PASSWORD_MAX_LENGTH_KEY),
    defaultPasswordPolicy.maxLength
  );

  if (minLength > maxLength) {
    throw new Error('Password policy is invalid: minimum length exceeds maximum length.');
  }

  return {
    minLength,
    maxLength,
  };
}

function parsePositiveIntegerSetting(
  rawValue: string | undefined,
  fallback: number
): number {
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid auth setting value: ${rawValue}`);
  }

  return parsedValue;
}
