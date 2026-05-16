import "server-only";

// In-memory pub/sub for "wallet → received Pro payment" events.
// Works on a single Node instance (dev + small Vercel deployments). For
// horizontally-scaled deploys, replace this module with a Redis-backed
// implementation that exposes the same {subscribe, publish, recent} API.

export interface PaymentEvent {
  wallet: string;
  signature: string;
  lamports: number;
  timestamp: number;
}

type Listener = (e: PaymentEvent) => void;
const listeners = new Map<string, Set<Listener>>();

// Short-lived buffer of recent events keyed by wallet, so a slow SSE
// connect (after the webhook already fired) still gets the notification.
const recent = new Map<string, PaymentEvent>();
const RECENT_TTL_MS = 5 * 60 * 1000;

export function subscribe(wallet: string, fn: Listener): () => void {
  let set = listeners.get(wallet);
  if (!set) { set = new Set(); listeners.set(wallet, set); }
  set.add(fn);

  // Replay any event seen within the last 5 minutes.
  const cached = recent.get(wallet);
  if (cached && Date.now() - cached.timestamp < RECENT_TTL_MS) {
    queueMicrotask(() => fn(cached));
  }

  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(wallet);
  };
}

export function publish(e: PaymentEvent): void {
  recent.set(e.wallet, e);
  const set = listeners.get(e.wallet);
  if (set) for (const fn of set) {
    try { fn(e); } catch { /* listener errors must not block others */ }
  }
  // Sweep stale recents opportunistically.
  if (recent.size > 64) {
    const cutoff = Date.now() - RECENT_TTL_MS;
    for (const [k, v] of recent) if (v.timestamp < cutoff) recent.delete(k);
  }
}
