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

/**
 * Emits a Sentry `db` span per MongoDB command using the driver's command
 * monitoring events. Because these events fire while a repository call is being
 * awaited (inside the active service span), each DB span nests under the request
 * trace, giving per-operation names and durations for the three main flows.
 */
function enableMongoCommandMonitoring(client: MongoClient): void {
  const pending = new Map<number, Span>();

  client.on('commandStarted', (event) => {
    if (IGNORED_MONGO_COMMANDS.has(event.commandName)) return;

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
    pending.set(event.requestId, span);
  });

  const finish = (requestId: number, failed: boolean) => {
    const span = pending.get(requestId);
    if (!span) return;
    if (failed) span.setStatus({ code: 2, message: 'internal_error' });
    span.end();
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
