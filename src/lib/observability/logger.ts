import 'server-only';

import pino, { type Logger } from 'pino';

// Structured JSON logger for all server-side code. In development it pretty-prints
// via `pino-pretty`; in production it writes newline-delimited JSON to stdout,
// which the container/host runtime collects. Sensitive fields are redacted so
// tokens, passwords, MFA codes and raw statement/bill contents never reach logs.

const isDev = process.env.NODE_ENV !== 'production';

const REDACT_PATHS = [
  'password',
  'token',
  'code',
  'backupCodes',
  'csvText',
  'authorization',
  '*.password',
  '*.token',
  '*.code',
  '*.csvText',
];

function createLogger(): Logger {
  const options: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    base: { service: 'budget-tracker' },
    redact: { paths: REDACT_PATHS, remove: true },
  };

  if (isDev) {
    try {
      return pino({
        ...options,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
        },
      });
    } catch {
      // Fall back to plain JSON if the pretty transport can't be loaded
      // (e.g. worker-thread resolution issues in some bundlers).
    }
  }

  return pino(options);
}

// Reuse a single logger instance across requests via `globalThis`, matching the
// singleton pattern used elsewhere (Mongo client, service factories).
declare global {
  var __appLogger__: Logger | undefined;
}

export const logger: Logger = globalThis.__appLogger__ ?? createLogger();

if (!globalThis.__appLogger__) {
  globalThis.__appLogger__ = logger;
}
