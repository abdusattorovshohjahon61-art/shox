// Ma'lumotlar bazasi: libSQL (SQLite). Lokal faylda yoki Turso bulutida ishlaydi.
// DATABASE_URL=file:./data/shox.db (standart) yoki libsql://...turso.io

import { createClient, type Client, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    output_url TEXT,
    storage_key TEXT,
    error TEXT,
    credits INTEGER NOT NULL,
    refunded INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS jobs_user ON jobs(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pack TEXT NOT NULL,
    amount INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    provider_tx TEXT,
    payme_state INTEGER,
    payme_time INTEGER,
    create_time INTEGER,
    perform_time INTEGER,
    cancel_time INTEGER,
    cancel_reason INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_tx ON orders(provider, provider_tx)`,
  `CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS rate_hits (
    key TEXT NOT NULL,
    ts INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS rate_hits_key ON rate_hits(key, ts)`,
];

let client: Client | undefined;
let ready: Promise<void> | undefined;

function getClient(): Client {
  if (!client) {
    const url = process.env.DATABASE_URL || "file:./data/shox.db";
    if (url.startsWith("file:")) {
      if (process.env.VERCEL) {
        throw new Error("Vercel'da fayl bazasi saqlanmaydi: DATABASE_URL ga Turso (libsql://...) manzilini kiriting");
      }
      mkdirSync(dirname(url.slice(5)), { recursive: true });
    }
    client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return client;
}

export async function db(): Promise<Client> {
  const c = getClient();
  if (!ready) {
    ready = (async () => {
      await c.execute("PRAGMA foreign_keys = ON");
      await c.batch(SCHEMA, "write");
    })().catch((e) => {
      ready = undefined;
      throw e;
    });
  }
  await ready;
  return c;
}

export async function one<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const r = await (await db()).execute({ sql, args });
  return r.rows[0] as T | undefined;
}

export async function all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const r = await (await db()).execute({ sql, args });
  return r.rows as unknown as T[];
}

export async function run(sql: string, args: InValue[] = []): Promise<number> {
  const r = await (await db()).execute({ sql, args });
  return r.rowsAffected;
}

// Bir nechta yozuvni bitta tranzaksiyada bajaradi
export async function tx<T>(fn: (exec: (sql: string, args?: InValue[]) => Promise<{ rows: unknown[]; rowsAffected: number }>) => Promise<T>): Promise<T> {
  const t = await (await db()).transaction("write");
  try {
    const result = await fn(async (sql, args = []) => {
      const r = await t.execute({ sql, args });
      return { rows: r.rows as unknown[], rowsAffected: r.rowsAffected };
    });
    await t.commit();
    return result;
  } catch (e) {
    await t.rollback();
    throw e;
  } finally {
    t.close();
  }
}
