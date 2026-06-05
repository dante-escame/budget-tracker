import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@/lib/auth/schemas';

describe('signInSchema', () => {
  it('accepts a valid email and password', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'correcthorsebattery',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const result = signInSchema.safeParse({
      email: 'not-an-email',
      password: 'correcthorsebattery',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address.');
  });

  it('rejects an empty password', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Password is required.');
  });

  it('rejects when fields are missing', () => {
    expect(signInSchema.safeParse({}).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  it('accepts a valid email and password meeting the minimum length', () => {
    const result = signUpSchema.safeParse({
      email: 'new@example.com',
      password: 'a'.repeat(12),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 12 characters', () => {
    const result = signUpSchema.safeParse({
      email: 'new@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Password must be at least 12 characters.'
    );
  });

  it('rejects a password longer than 128 characters', () => {
    const result = signUpSchema.safeParse({
      email: 'new@example.com',
      password: 'a'.repeat(129),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Password must be 128 characters or fewer.'
    );
  });

  it('rejects a malformed email', () => {
    const result = signUpSchema.safeParse({
      email: 'bad-email',
      password: 'strongpassword42',
    });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects an empty email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Email is required.');
  });

  it('rejects a malformed email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'notanemail' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid token and password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'some-reset-token',
      password: 'newstrongpassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty token', () => {
    const result = resetPasswordSchema.safeParse({
      token: '',
      password: 'newstrongpassword',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Token is required.');
  });

  it('rejects a password shorter than 12 characters', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'some-reset-token',
      password: 'tooshort',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Password must be at least 12 characters.'
    );
  });
});

describe('verifyEmailSchema', () => {
  it('accepts a valid token', () => {
    expect(verifyEmailSchema.safeParse({ token: 'some-verify-token' }).success).toBe(true);
  });

  it('rejects an empty token', () => {
    const result = verifyEmailSchema.safeParse({ token: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Token is required.');
  });

  it('rejects when token field is absent', () => {
    expect(verifyEmailSchema.safeParse({}).success).toBe(false);
  });
});
