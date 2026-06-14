import { NextResponse } from 'next/server';

import QRCode from 'qrcode';

import { extractRequestContext, parseBodyWithSchema } from '@/lib/auth/http';
import { mfaEnrollSchema } from '@/lib/auth/schemas';
import { getAuthService } from '@/lib/auth/runtime';
import { mfaErrorResponse, requireRecentAuthUser } from '@/lib/auth/mfa-http';

export async function POST(request: Request) {
  const auth = await requireRecentAuthUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseBodyWithSchema(request, mfaEnrollSchema);
  if (!parsed.ok) return parsed.response;

  const authService = await getAuthService();
  const context = extractRequestContext(request);

  try {
    if (parsed.data.type === 'totp') {
      const start = await authService.startTotpEnrollment(
        auth.user.id,
        auth.user.emailDisplay,
        context
      );
      const qrDataUrl = start.otpauthUri
        ? await QRCode.toDataURL(start.otpauthUri)
        : null;

      return NextResponse.json({
        type: start.type,
        secret: start.secret,
        otpauthUri: start.otpauthUri,
        qrDataUrl,
      });
    }

    const start = await authService.startEmailEnrollment(
      auth.user.id,
      auth.user.emailDisplay,
      context
    );

    return NextResponse.json({ type: start.type });
  } catch (error) {
    return mfaErrorResponse(error);
  }
}
