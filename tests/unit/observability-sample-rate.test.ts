import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  parseSampleRate,
  resolveTracesSampleRate,
} from '@/lib/observability/sample-rate';

describe('parseSampleRate', () => {
  it('honors an explicit 0 (tracing disabled)', () => {
    expect(parseSampleRate('0', 0.2)).toBe(0);
  });

  it('parses valid rates within [0, 1]', () => {
    expect(parseSampleRate('0.35', 0.2)).toBe(0.35);
    expect(parseSampleRate('1', 0.2)).toBe(1);
  });

  it('falls back for unset or invalid values', () => {
    expect(parseSampleRate(undefined, 0.2)).toBe(0.2);
    expect(parseSampleRate('', 0.2)).toBe(0.2);
    expect(parseSampleRate('abc', 0.2)).toBe(0.2);
  });

  it('falls back for out-of-range values', () => {
    expect(parseSampleRate('5', 0.2)).toBe(0.2);
    expect(parseSampleRate('-1', 0.2)).toBe(0.2);
  });
});

describe('resolveTracesSampleRate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the same default in every runtime: 0.2 in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveTracesSampleRate(undefined)).toBe(0.2);
  });

  it('defaults to 1.0 outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(resolveTracesSampleRate(undefined)).toBe(1.0);
  });

  it('explicit values win over the default', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveTracesSampleRate('0')).toBe(0);
    expect(resolveTracesSampleRate('0.5')).toBe(0.5);
  });
});
