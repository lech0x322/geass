import "server-only";
import type { FeedTrade } from "../types";
import { redis } from "./redis";

type Listener = (trade: FeedTrade) => void;
const listeners = new Set<Listener>();
const recentTrades: FeedTrade[] = [];
const MAX_RECENT = 200;

// Redis-backed mirror so the feed survives across serverless instances:
// the Helius webhook POST and the SSE stream usually run on *different*
// lambdas, so an in-memory-only feed would always look empty in production.
const FEED_KEY     = "kol:feed:recent";
const FEED_TTL_SEC = 60 * 60; // 1h

export function publishKolTrade(trade: FeedTrade): void {
  // In-memory fast path — instant delivery to listeners on this instance.
  recentTrades.unshift(trade);
  if (recentTrades.length > MAX_RECENT) recentTrades.pop();
  listeners.forEach(fn => { try { fn(trade); } catch {} });

  // Cross-instance durability — fire-and-forget, never blocks the webhook.
  if (redis.available()) {
    void redis.lpushTrim(FEED_KEY, trade, MAX_RECENT, FEED_TTL_SEC);
  }
}

export function subscribeKolFeed(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** In-memory snapshot (same-instance only). */
export function getRecentTrades(): FeedTrade[] {
  return [...recentTrades];
}

/**
 * Cross-instance snapshot. Reads the durable Redis feed when configured,
 * merged with this instance's in-memory trades and de-duplicated by id.
 * Falls back to in-memory when Redis is unavailable.
 */
export async function getRecentTradesAsync(): Promise<FeedTrade[]> {
  if (!redis.available()) return getRecentTrades();
  const remote = await redis.lrange<FeedTrade>(FEED_KEY, 0, MAX_RECENT - 1);
  const seen = new Set<string>();
  const merged: FeedTrade[] = [];
  for (const t of [...recentTrades, ...remote]) {
    if (!t?.id || seen.has(t.id)) continue;
    seen.add(t.id);
    merged.push(t);
  }
  merged.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  return merged.slice(0, MAX_RECENT);
}

/** Latest trades from the durable feed (for cross-instance polling in SSE). */
export async function pollRedisFeed(): Promise<FeedTrade[]> {
  if (!redis.available()) return [];
  return redis.lrange<FeedTrade>(FEED_KEY, 0, MAX_RECENT - 1);
}
