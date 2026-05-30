import "server-only";

/**
 * Postgres-backed key/value store (Neon).
 *
 * Re-implements the exact surface the app previously used against Upstash
 * Redis (`get`, `set`, `hget`, `hset`, `hgetall`, `lpushTrim`, `lrange`,
 * `available`) so that consumers migrate to durable Postgres storage with
 * zero call-site changes.
 *
 * Storage model:
 *   kv_store  — plain keys           → JSONB value (+ optional expiry)
 *   kv_hash   — hash keys            → field → JSONB value
 *   kv_list   — list keys (capped)   → ordered JSONB elements (newest first)
 *
 * Values are stored as JSONB, mirroring Upstash's auto-(de)serialization:
 * a `get` returns the parsed JS value, exactly like before.
 *
 * If DATABASE_URL is unset the module degrades to a no-op (same behaviour the
 * Redis wrapper had when Upstash credentials were missing), so local dev and
 * the build never hard-fail on a missing database.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
let _schema: Promise<void> | null = null;

function getSql(): NeonQueryFunction<false, false> | null {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) return null;
  _sql = neon(url);
  return _sql;
}

/** Lazily create the backing tables once per server process (idempotent). */
async function ensureSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (_schema) return _schema;
  _schema = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS kv_store (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      expires_at TIMESTAMPTZ
    )`;
    await sql`CREATE TABLE IF NOT EXISTS kv_hash (
      key   TEXT NOT NULL,
      field TEXT NOT NULL,
      value JSONB NOT NULL,
      PRIMARY KEY (key, field)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS kv_list (
      key        TEXT NOT NULL,
      seq        BIGSERIAL PRIMARY KEY,
      value      JSONB NOT NULL,
      expires_at TIMESTAMPTZ
    )`;
    await sql`CREATE INDEX IF NOT EXISTS kv_list_key_seq ON kv_list (key, seq DESC)`;
  })().catch(e => {
    // Allow a later call to retry schema creation if the first attempt failed.
    _schema = null;
    throw e;
  });
  return _schema;
}

/** Run `fn` with a ready connection, swallowing errors like the old wrapper. */
async function withSql<T>(
  op: string,
  fallback: T,
  fn: (sql: NeonQueryFunction<false, false>) => Promise<T>,
): Promise<T> {
  const sql = getSql();
  if (!sql) return fallback;
  try {
    await ensureSchema(sql);
    return await fn(sql);
  } catch (e) {
    console.error(`[kv] ${op}:`, e);
    return fallback;
  }
}

function expiryISO(exSeconds?: number): string | null {
  return exSeconds !== undefined ? new Date(Date.now() + exSeconds * 1000).toISOString() : null;
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    return withSql("get", null, async sql => {
      const rows = (await sql`
        SELECT value FROM kv_store
        WHERE key = ${key} AND (expires_at IS NULL OR expires_at > now())
      `) as { value: T }[];
      return rows.length ? rows[0].value : null;
    });
  },

  async set(key: string, value: unknown, exSeconds?: number): Promise<void> {
    await withSql("set", undefined, async sql => {
      const json = JSON.stringify(value);
      const exp = expiryISO(exSeconds);
      await sql`
        INSERT INTO kv_store (key, value, expires_at)
        VALUES (${key}, ${json}::jsonb, ${exp})
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at
      `;
    });
  },

  async hget<T>(key: string, field: string): Promise<T | null> {
    return withSql("hget", null, async sql => {
      const rows = (await sql`
        SELECT value FROM kv_hash WHERE key = ${key} AND field = ${field}
      `) as { value: T }[];
      return rows.length ? rows[0].value : null;
    });
  },

  async hset(key: string, field: string, value: unknown): Promise<void> {
    await withSql("hset", undefined, async sql => {
      const json = JSON.stringify(value);
      await sql`
        INSERT INTO kv_hash (key, field, value)
        VALUES (${key}, ${field}, ${json}::jsonb)
        ON CONFLICT (key, field) DO UPDATE SET value = EXCLUDED.value
      `;
    });
  },

  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    return withSql<Record<string, T> | null>("hgetall", null, async sql => {
      const rows = (await sql`
        SELECT field, value FROM kv_hash WHERE key = ${key}
      `) as { field: string; value: T }[];
      if (!rows.length) return null;
      const out: Record<string, T> = {};
      for (const r of rows) out[r.field] = r.value;
      return out;
    });
  },

  /** Push to head of a list, then trim to keep only the newest `keep` items. */
  async lpushTrim(key: string, value: unknown, keep: number, exSeconds?: number): Promise<void> {
    await withSql("lpushTrim", undefined, async sql => {
      const json = JSON.stringify(value);
      const exp = expiryISO(exSeconds);
      await sql`INSERT INTO kv_list (key, value, expires_at) VALUES (${key}, ${json}::jsonb, ${exp})`;
      // Keep only the newest `keep` rows for this key.
      await sql`
        DELETE FROM kv_list
        WHERE key = ${key}
          AND seq NOT IN (
            SELECT seq FROM kv_list WHERE key = ${key} ORDER BY seq DESC LIMIT ${keep}
          )
      `;
      // Refresh expiry across the whole key (mirrors Redis EXPIRE semantics).
      if (exp !== null) {
        await sql`UPDATE kv_list SET expires_at = ${exp} WHERE key = ${key}`;
      }
    });
  },

  /** Read a range of a list (default: entire list), newest first. */
  async lrange<T>(key: string, start = 0, stop = -1): Promise<T[]> {
    return withSql<T[]>("lrange", [], async sql => {
      const rows = (await sql`
        SELECT value FROM kv_list
        WHERE key = ${key} AND (expires_at IS NULL OR expires_at > now())
        ORDER BY seq DESC
      `) as { value: T }[];
      const all = rows.map(r => r.value);
      // Translate Redis-style inclusive start/stop (supports negative indices).
      const len = all.length;
      const s = start < 0 ? Math.max(len + start, 0) : start;
      const e = stop < 0 ? len + stop : stop;
      if (s > e || s >= len) return [];
      return all.slice(s, e + 1);
    });
  },

  available(): boolean {
    return getSql() !== null;
  },
};
