import 'server-only';

import { Resend } from 'resend';

const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const emailFrom = process.env.EMAIL_FROM ?? 'Budget Tracker <noreply@budgettracker.app>';

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  return new Resend(apiKey);
}

/**
 * Without a mail provider in development, print what would have been emailed so
 * the flow can continue (follow the link / type the code). Deliberately uses
 * `console.log`, not the structured logger: it must print regardless of
 * LOG_LEVEL, and the secret lives in the message text where pino redaction
 * can't apply — this dev-only output is the one sanctioned exemption to the
 * "no tokens/codes in logs" rule.
 */
function printDevMailFallback(message: string): boolean {
  if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) {
    console.log(`[mailer] ${message}`);
    return true;
  }
  return false;
}

// The Resend SDK reports API failures (unverified `from` domain, invalid key,
// rate limits, …) in the returned `error` field instead of throwing, so a send
// can "succeed" while delivering nothing. Surface those as real errors.
async function deliver(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResend();

  const { error } = await resend.emails.send({ from: emailFrom, ...payload });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  if (printDevMailFallback(`Verification link for ${to}: ${link}`)) {
    return;
  }

  await deliver({
    to,
    subject: 'Verify your email address',
    html: `
      <p>Thanks for signing up! Click the link below to verify your email address:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours. If you did not sign up, you can ignore this email.</p>
    `,
  });
}

export async function sendMfaCodeEmail(to: string, code: string): Promise<void> {
  if (printDevMailFallback(`MFA code for ${to}: ${code}`)) {
    return;
  }

  await deliver({
    to,
    subject: 'Your Budget Tracker verification code',
    html: `
      <p>Your verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>This code expires shortly. If you did not request it, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (printDevMailFallback(`Password reset link for ${to}: ${link}`)) {
    return;
  }

  await deliver({
    to,
    subject: 'Reset your password',
    html: `
      <p>We received a request to reset your password. Click the link below:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    `,
  });
}
