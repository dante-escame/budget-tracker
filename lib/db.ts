import mongoose from "mongoose";

let cached = global.mongoose as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Please set MONGODB_URI in .env.local");
  }

  if (cached?.conn) return cached.conn;

  if (!cached?.promise) {
    cached!.promise = mongoose.connect(mongoUri, { dbName: "budget_tracker" });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}
