import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const childSpy = vi.hoisted(() =>
  vi.fn((_bindings: Record<string, unknown>) => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }))
);

vi.mock('@/lib/observability/logger', () => ({
  logger: { child: childSpy },
}));

vi.mock('@sentry/nextjs', () => ({
  getActiveSpan: () => undefined,
  spanToJSON: () => ({}),
  getCurrentScope: () => ({
    getPropagationContext: () => ({ traceId: 'trace-1' }),
  }),
  startSpan: (_opts: unknown, fn: () => unknown) => fn(),
  captureException: vi.fn(),
}));

import { instrument, userIdFromArgs } from '@/lib/observability/instrument';

describe('userIdFromArgs', () => {
  it('returns the argument at the opted-in index', () => {
    expect(userIdFromArgs(['user-123', 'other'], 0)).toBe('user-123');
    expect(userIdFromArgs(['first', 'user-456'], 1)).toBe('user-456');
  });

  it('returns undefined without an opt-in, even for id-like secrets', () => {
    // The auth case: a reset/verification token as first argument must never
    // be picked up implicitly.
    expect(userIdFromArgs(['dGhpc0lzQVNlY3JldFRva2Vu'], undefined)).toBeUndefined();
  });

  it('returns undefined for non-string or empty values at the index', () => {
    expect(userIdFromArgs([{ userId: 'u' }], 0)).toBeUndefined();
    expect(userIdFromArgs([''], 0)).toBeUndefined();
    expect(userIdFromArgs([], 0)).toBeUndefined();
  });
});

describe('instrument userId logging', () => {
  beforeEach(() => {
    childSpy.mockClear();
  });

  it('logs userId for a domain opted in via userIdArg', async () => {
    const service = instrument(
      { getThing: async (userId: string) => userId },
      { domain: 'entries', userIdArg: 0 }
    );

    await service.getThing('user-1');

    expect(childSpy).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'entries.getThing', userId: 'user-1' })
    );
  });

  it('never logs a userId for a domain without userIdArg', async () => {
    const service = instrument(
      { resetPassword: async (token: string) => token },
      { domain: 'auth' }
    );

    await service.resetPassword('secret-reset-token');

    expect(childSpy).toHaveBeenCalledTimes(1);
    expect(childSpy.mock.calls[0][0]).toMatchObject({
      flow: 'auth.resetPassword',
      userId: undefined,
    });
  });
});
