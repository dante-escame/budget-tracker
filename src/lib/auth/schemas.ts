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

export const signInSchema = z.object({ email, password: signInPassword });
export const signUpSchema = z.object({ email, password });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token, password });
export const verifyEmailSchema = z.object({ token });

export type SignInFields = z.infer<typeof signInSchema>;
export type SignUpFields = z.infer<typeof signUpSchema>;
export type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFields = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailFields = z.infer<typeof verifyEmailSchema>;
