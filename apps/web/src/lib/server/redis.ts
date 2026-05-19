import "server-only";

/**
 * Thin Redis abstraction.
 *
 * Priority:
 *  1. Upstash  — UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *  2. Fallback — no-op (in-memory stays in smartWallets.ts)
 *
 * A self-hosted redis:// URL can be added later by swapping this module
 * for ioredis.
 */

import { Redis } from "@upstash/redis";

let _client: Redis | null = null;

function getClient(): Redis | null {
  if (_client) return _client;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _client = new Redis({ url, token });
  return _client;
}

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    try { return (await getClient()?.get<T>(key)) ?? null; }
    catch (e) { console.error("[redis] get:", e); return null; }
  },
  async set(key: string, value: unknown, exSeconds?: number): Promise<void> {
    try {
      if (exSeconds !== undefined) {
        await getClient()?.set(key, JSON.stringify(value), { ex: exSeconds });
      } else {
        await getClient()?.set(key, JSON.stringify(value));
      }
    } catch (e) { console.error("[redis] set:", e); }
  },
  async hget<T>(key: string, field: string): Promise<T | null> {
    try { return (await getClient()?.hget<T>(key, field)) ?? null; }
    catch (e) { console.error("[redis] hget:", e); return null; }
  },
  async hset(key: string, field: string, value: unknown): Promise<void> {
    try { await getClient()?.hset(key, { [field]: JSON.stringify(value) }); }
    catch (e) { console.error("[redis] hset:", e); }
  },
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    try { return (await getClient()?.hgetall<Record<string, T>>(key)) ?? null; }
    catch (e) { console.error("[redis] hgetall:", e); return null; }
  },
  available(): boolean {
    return getClient() !== null;
  },
};
