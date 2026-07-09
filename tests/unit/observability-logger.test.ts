import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';

vi.mock('server-only', () => ({}));

// Import with NODE_ENV=production so the module builds a plain pino instance
// instead of spawning the dev pino-pretty worker-thread transport in tests.
vi.stubEnv('NODE_ENV', 'production');
const { REDACT_PATHS } = await import('@/lib/observability/logger');
vi.unstubAllEnvs();

// Build a pino instance with the app's real redact configuration writing to an
// in-memory sink, so we assert against exactly what production redacts.
function captureLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = pino(
    { redact: { paths: [...REDACT_PATHS], remove: true } },
    { write: (line: string) => lines.push(JSON.parse(line)) }
  );
  return { logger, lines };
}

describe('logger redaction', () => {
  it('keeps err.code so diagnostic codes survive', () => {
    const { logger, lines } = captureLogger();
    const err = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
    });

    logger.error({ err }, 'delivery failed');

    expect(lines).toHaveLength(1);
    const logged = lines[0].err as Record<string, unknown>;
    expect(logged.code).toBe('ECONNREFUSED');
    expect(logged.message).toBe('connect ECONNREFUSED');
  });

  it('removes mfaCode at the top level and nested', () => {
    const { logger, lines } = captureLogger();

    logger.info({ mfaCode: '481920' }, 'top-level');
    logger.info({ challenge: { mfaCode: '481920' } }, 'nested');

    expect(lines[0]).not.toHaveProperty('mfaCode');
    expect(lines[1].challenge).not.toHaveProperty('mfaCode');
  });

  it('still removes the other sensitive fields', () => {
    const { logger, lines } = captureLogger();

    logger.info(
      { password: 'p', token: 't', csvText: 'a,b', authorization: 'Bearer x' },
      'sensitive'
    );

    expect(lines[0]).not.toHaveProperty('password');
    expect(lines[0]).not.toHaveProperty('token');
    expect(lines[0]).not.toHaveProperty('csvText');
    expect(lines[0]).not.toHaveProperty('authorization');
  });
});
