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

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) {
    console.log(`[mailer] Verification link for ${to}: ${link}`);
    return;
  }

  const resend = getResend();

  await resend.emails.send({
    from: emailFrom,
    to,
    subject: 'Verify your email address',
    html: `
      <p>Thanks for signing up! Click the link below to verify your email address:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours. If you did not sign up, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) {
    console.log(`[mailer] Password reset link for ${to}: ${link}`);
    return;
  }

  const resend = getResend();

  await resend.emails.send({
    from: emailFrom,
    to,
    subject: 'Reset your password',
    html: `
      <p>We received a request to reset your password. Click the link below:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    `,
  });
}
