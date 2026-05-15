import "server-only";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface InFlight<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, InFlight<unknown>>();

function sweep(now: number) {
  if (store.size > 256) {
    for (const [k, v] of store) if (v.expiresAt <= now) store.delete(k);
  }
  if (inflight.size > 64) {
    for (const [k, v] of inflight) if (v.expiresAt <= now) inflight.delete(k);
  }
}

/**
 * Returns the cached value for `key` if it hasn't expired, otherwise
 * calls `fetcher()` and caches the result for `ttlMs`. Concurrent calls
 * with the same key are deduplicated — only one `fetcher()` runs.
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  sweep(now);

  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) return entry.value;

  const pending = inflight.get(key) as InFlight<T> | undefined;
  if (pending && pending.expiresAt > now) return pending.promise;

  const promise = (async () => {
    try {
      const value = await fetcher();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, { promise, expiresAt: now + 30_000 });
  return promise;
}

export function invalidate(key: string) {
  store.delete(key);
}

export function cacheStats() {
  return { entries: store.size, inflight: inflight.size };
}
