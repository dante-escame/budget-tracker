'use server';

import { redirect } from 'next/navigation';

import { getAuthService } from '@/lib/auth/runtime';
import { signInSchema, signUpSchema, forgotPasswordSchema } from '@/lib/auth/schemas';
import {
  AuthenticationRequiredError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '@/lib/auth/service';
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/mailer';

export type AuthActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string; actionHref?: string; actionLabel?: string }
  | { status: 'error'; message: string };

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const authService = await getAuthService();

  try {
    const user = await authService.verifyPasswordLogin(parsed.data);
    await authService.createSession(user);
  } catch (error) {
    if (
      error instanceof InvalidCredentialsError ||
      error instanceof AuthenticationRequiredError
    ) {
      return { status: 'error', message: 'Invalid email or password.' };
    }
    if (error instanceof EmailNotVerifiedError) {
      return { status: 'error', message: error.message };
    }
    throw error;
  }

  redirect('/dashboard');
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const authService = await getAuthService();

  try {
    const user = await authService.createUser({ email: parsed.data.email, password: parsed.data.password });
    const verification = await authService.issueToken(user.id, 'email_verification');
    await sendVerificationEmail(user.emailDisplay, verification.token);
  } catch (error) {
    if (error instanceof Error) {
      return { status: 'error', message: error.message };
    }
    throw error;
  }

  return {
    status: 'success',
    message: 'Account created. Check your email to verify the address before signing in.',
  };
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const authService = await getAuthService();

  try {
    const tokenResult = await authService.requestPasswordReset(parsed.data.email);

    if (tokenResult) {
      await sendPasswordResetEmail(parsed.data.email, tokenResult.token);
    }
  } catch (error) {
    if (error instanceof Error) {
      return { status: 'error', message: error.message };
    }
    throw error;
  }

  return {
    status: 'success',
    message: 'If the account exists, a password reset message can now be delivered.',
  };
}
