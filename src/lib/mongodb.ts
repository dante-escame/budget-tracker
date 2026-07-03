import 'server-only';

import { MongoClient, type Db } from 'mongodb';
import * as Sentry from '@sentry/nextjs';
import type { Span } from '@sentry/nextjs';

declare global {
  var __mongoClientPromise__: Promise<MongoClient> | undefined;
}

// Command monitoring is only worth its (small) overhead when telemetry is on.
function mongoMonitoringEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

// Internal handshake/heartbeat commands would only add noise to traces.
const IGNORED_MONGO_COMMANDS = new Set(['ismaster', 'hello', 'ping', 'endSessions']);

// If a command's completion event never fires (connection dropped mid-command,
// pool torn down), its span would otherwise sit in `pending` forever. Anything
// older than this is force-ended on the next command; no legitimate query in
// this app runs longer.
const PENDING_SPAN_TTL_MS = 60_000;

/**
 * Emits a Sentry `db` span per MongoDB command using the driver's command
 * monitoring events. Because these events fire while a repository call is being
 * awaited (inside the active service span), each DB span nests under the request
 * trace, giving per-operation names and durations for the three main flows.
 */
function enableMongoCommandMonitoring(client: MongoClient): void {
  const pending = new Map<number, { span: Span; startedAt: number }>();

  // Map iteration follows insertion order, so entries at the front are the
  // oldest; stop at the first one that is still fresh.
  const evictStale = (now: number) => {
    for (const [requestId, entry] of pending) {
      if (now - entry.startedAt < PENDING_SPAN_TTL_MS) break;
      entry.span.setStatus({ code: 2, message: 'deadline_exceeded' });
      entry.span.end();
      pending.delete(requestId);
    }
  };

  client.on('commandStarted', (event) => {
    if (IGNORED_MONGO_COMMANDS.has(event.commandName)) return;

    // Without an active span there is no trace to nest under — skip the span
    // allocation entirely (covers unsampled traces and non-request work).
    if (!Sentry.getActiveSpan()) return;

    evictStale(Date.now());

    // The value at `command[commandName]` is the target collection for CRUD ops.
    const collection = event.command?.[event.commandName];
    const target = typeof collection === 'string' ? ` ${collection}` : '';

    const span = Sentry.startInactiveSpan({
      name: `mongodb.${event.commandName}${target}`,
      op: 'db',
      attributes: {
        'db.system': 'mongodb',
        'db.operation': event.commandName,
        'db.name': event.databaseName,
        ...(typeof collection === 'string' ? { 'db.mongodb.collection': collection } : {}),
      },
    });
    pending.set(event.requestId, { span, startedAt: Date.now() });
  });

  const finish = (requestId: number, failed: boolean) => {
    const entry = pending.get(requestId);
    if (!entry) return;
    if (failed) entry.span.setStatus({ code: 2, message: 'internal_error' });
    entry.span.end();
    pending.delete(requestId);
  };

  client.on('commandSucceeded', (event) => finish(event.requestId, false));
  client.on('commandFailed', (event) => finish(event.requestId, true));
}

function getMongoMaxPoolSize(): number {
  const value = process.env.MONGODB_MAX_POOL_SIZE?.trim();

  if (!value) {
    return 10;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error('MONGODB_MAX_POOL_SIZE must be a positive integer.');
  }

  return parsedValue;
}

function getMongoUri(): string {
  const value = process.env.MONGODB_URI?.trim();

  if (!value) {
    throw new Error('Missing MONGODB_URI environment variable.');
  }

  return value;
}

function getMongoDbName(): string {
  const value = process.env.MONGODB_DB_NAME?.trim();

  if (!value) {
    throw new Error('Missing MONGODB_DB_NAME environment variable.');
  }

  return value;
}

function createMongoClient(): MongoClient {
  const monitor = mongoMonitoringEnabled();
  const client = new MongoClient(getMongoUri(), {
    maxPoolSize: getMongoMaxPoolSize(),
    monitorCommands: monitor,
  });

  if (monitor) {
    enableMongoCommandMonitoring(client);
  }

  return client;
}

export function getMongoClient(): Promise<MongoClient> {
  if (!globalThis.__mongoClientPromise__) {
    globalThis.__mongoClientPromise__ = createMongoClient().connect();
  }

  return globalThis.__mongoClientPromise__;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();

  return client.db(getMongoDbName());
}
