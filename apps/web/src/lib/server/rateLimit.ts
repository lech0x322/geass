import "server-only";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

/**
 * Simple per-key token bucket. `max` tokens, refilled at a rate of
 * `max / windowMs` tokens per millisecond. Each call consumes 1 token.
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const refillPerMs = max / windowMs;

  let b = buckets.get(key);
  if (!b) {
    b = { tokens: max, updatedAt: now };
    buckets.set(key, b);
  } else {
    const elapsed = now - b.updatedAt;
    b.tokens = Math.min(max, b.tokens + elapsed * refillPerMs);
    b.updatedAt = now;
  }

  if (buckets.size > 1024) {
    // opportunistic eviction of long-idle keys
    for (const [k, v] of buckets) {
      if (now - v.updatedAt > windowMs * 4) buckets.delete(k);
    }
  }

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { ok: true, remaining: Math.floor(b.tokens), retryAfterSec: 0, limit: max };
  }
  const deficit = 1 - b.tokens;
  const retryAfterMs = deficit / refillPerMs;
  return { ok: false, remaining: 0, retryAfterSec: Math.ceil(retryAfterMs / 1000), limit: max };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
}
