import { z } from 'zod';

const email = z
  .string()
  .min(1, 'Email is required.')
  .email('Enter a valid email address.');

// Default matches the server-side PasswordPolicy defaults (min: 12, max: 128).
// The server enforces the authoritative policy; this provides client-side feedback.
const password = z
  .string()
  .min(1, 'Password is required.')
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be 128 characters or fewer.');

// Sign-in only requires non-empty: the server verifies the actual password.
const signInPassword = z.string().min(1, 'Password is required.');

const token = z.string().min(1, 'Token is required.');

const mfaMethodType = z.enum(['totp', 'email']);

// A login challenge code may be a 6-digit OTP/TOTP or a formatted backup code.
const mfaCode = z
  .string()
  .min(1, 'Enter your verification code.')
  .max(32, 'Code is too long.');

export const mfaEnrollSchema = z.object({ type: mfaMethodType });
export const mfaConfirmEnrollSchema = z.object({ type: mfaMethodType, code: mfaCode });
export const mfaDisableSchema = z.object({ type: mfaMethodType });
export const mfaLoginVerifySchema = z.object({ code: mfaCode });

export const signInSchema = z.object({ email, password: signInPassword });
export const signUpSchema = z.object({ email, password });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token, password });
export const verifyEmailSchema = z.object({ token });

export type MfaEnrollFields = z.infer<typeof mfaEnrollSchema>;
export type MfaConfirmEnrollFields = z.infer<typeof mfaConfirmEnrollSchema>;
export type MfaDisableFields = z.infer<typeof mfaDisableSchema>;
export type MfaLoginVerifyFields = z.infer<typeof mfaLoginVerifySchema>;

export type SignInFields = z.infer<typeof signInSchema>;
export type SignUpFields = z.infer<typeof signUpSchema>;
export type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFields = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailFields = z.infer<typeof verifyEmailSchema>;
