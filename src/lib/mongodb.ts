import 'server-only';

import { MongoClient, type Db } from 'mongodb';

declare global {
  var __mongoClientPromise__: Promise<MongoClient> | undefined;
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
  return new MongoClient(getMongoUri(), {
    maxPoolSize: getMongoMaxPoolSize(),
  });
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
