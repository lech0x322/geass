import "server-only";
import { redis } from "./redis";

/**
 * Auto-discovered "smart wallet" registry.
 *
 * Fed by the Helius webhook subscribed to the Pump.fun program. Each pump
 * swap updates per-wallet stats; wallets that cross the SMART_WALLET_*
 * thresholds are promoted to "detected KOLs" and surfaced in the KOL feed.
 *
 * Persistence: Redis (Upstash) when env vars are present; falls back to
 * in-memory for local dev / cold starts without Redis configured.
 */

export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

export const SMART_WALLET_MIN_TRADE_SOL = 0.1;
export const SMART_WALLET_MIN_VOLUME_SOL = 10;
export const SMART_WALLET_MIN_TRADES     = 5;
export const SMART_WALLET_MIN_WINRATE    = 0.55;

/** TTL for wallet stats in Redis: 30 days of inactivity expires them. */
const REDIS_TTL_SECONDS = 60 * 60 * 24 * 30;
const REDIS_HASH_KEY = "geass:smart_wallets";

// ── Serializable shape stored in Redis ──────────────────────────────────────

interface PersistedPosition {
  costSol: number;
  tokens: number;
}

interface PersistedStats {
  addr: string;
  buys: number;
  sells: number;
  volumeSol: number;
  realizedPnlSol: number;
  wins: number;
  closed: number;
  /** mint → position */
  positions: Record<string, PersistedPosition>;
  mints: string[];          // stored as array; deduped on load
  firstSeen: number;
  lastSeen: number;
}

// ── In-memory hot cache (reduces Redis round-trips per request) ──────────────

const hotCache = new Map<string, PersistedStats>();
const MAX_HOT  = 2000;
// Evict the oldest entry when the cache is full.
function hotEvict() {
  if (hotCache.size < MAX_HOT) return;
  let oldestKey = "";
  let oldest = Infinity;
  for (const [k, v] of hotCache) {
    if (v.lastSeen < oldest) { oldest = v.lastSeen; oldestKey = k; }
  }
  if (oldestKey) hotCache.delete(oldestKey);
}

async function load(addr: string): Promise<PersistedStats> {
  if (hotCache.has(addr)) return hotCache.get(addr)!;

  if (redis.available()) {
    const raw = await redis.hget<string>(REDIS_HASH_KEY, addr);
    if (raw) {
      const parsed: PersistedStats = typeof raw === "string" ? JSON.parse(raw) : raw;
      hotCache.set(addr, parsed);
      return parsed;
    }
  }

  const fresh: PersistedStats = {
    addr, buys: 0, sells: 0, volumeSol: 0, realizedPnlSol: 0,
    wins: 0, closed: 0, positions: {}, mints: [],
    firstSeen: Date.now(), lastSeen: Date.now(),
  };
  return fresh;
}

async function save(s: PersistedStats): Promise<void> {
  hotEvict();
  hotCache.set(s.addr, s);
  if (redis.available()) {
    await redis.hset(REDIS_HASH_KEY, s.addr, s);
    // Refresh top-level TTL so inactive wallets expire eventually.
    await redis.set(`${REDIS_HASH_KEY}:ttl`, Date.now(), REDIS_TTL_SECONDS);
  }
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface PumpTradeEvent {
  wallet: string;
  mint: string;
  side: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  ts: number;
}

export interface SmartWalletSummary {
  addr: string;
  trades: number;
  volumeSol: number;
  realizedPnlSol: number;
  winRate: number;
  uniqueMints: number;
  firstSeen: number;
  lastSeen: number;
}

// ── Core logic ───────────────────────────────────────────────────────────────

function summarize(s: PersistedStats): SmartWalletSummary {
  return {
    addr: s.addr,
    trades: s.buys + s.sells,
    volumeSol: Number(s.volumeSol.toFixed(3)),
    realizedPnlSol: Number(s.realizedPnlSol.toFixed(3)),
    winRate: s.closed ? Number((s.wins / s.closed).toFixed(3)) : 0,
    uniqueMints: s.mints.length,
    firstSeen: s.firstSeen,
    lastSeen: s.lastSeen,
  };
}

export function isSmartWalletStats(s: SmartWalletSummary | PersistedStats): boolean {
  const trades = "trades" in s ? s.trades : (s as PersistedStats).buys + (s as PersistedStats).sells;
  const closed = "closed" in s ? (s as PersistedStats).closed : 0;
  const wins   = "wins"   in s ? (s as PersistedStats).wins   : 0;
  const vol    = s.volumeSol;
  const wr     = "winRate" in s ? (s as SmartWalletSummary).winRate : (closed ? wins / closed : 0);

  if (vol < SMART_WALLET_MIN_VOLUME_SOL) return false;
  if (trades < SMART_WALLET_MIN_TRADES)  return false;
  if (closed === 0) return trades >= SMART_WALLET_MIN_TRADES * 2;
  return wr >= SMART_WALLET_MIN_WINRATE;
}

// Exported alias kept simple.
export const isSmartWallet = isSmartWalletStats;

/** Record a pump.fun swap and return the updated summary (or null if trade below min size). */
export async function recordTrade(ev: PumpTradeEvent): Promise<SmartWalletSummary | null> {
  if (ev.solAmount < SMART_WALLET_MIN_TRADE_SOL) return null;

  const s = await load(ev.wallet);
  s.lastSeen = ev.ts;
  s.volumeSol += ev.solAmount;
  if (!s.mints.includes(ev.mint)) s.mints.push(ev.mint);

  const pos: PersistedPosition = s.positions[ev.mint] ?? { costSol: 0, tokens: 0 };

  if (ev.side === "buy") {
    s.buys++;
    pos.costSol += ev.solAmount;
    pos.tokens  += ev.tokenAmount;
  } else {
    s.sells++;
    s.closed++;
    if (pos.tokens > 0) {
      const fraction = Math.min(ev.tokenAmount / pos.tokens, 1);
      const costBasis = pos.costSol * fraction;
      const pnl = ev.solAmount - costBasis;
      s.realizedPnlSol += pnl;
      if (pnl > 0) s.wins++;
      pos.costSol -= costBasis;
      pos.tokens   = Math.max(0, pos.tokens - ev.tokenAmount);
    } else {
      s.realizedPnlSol += ev.solAmount;
      s.wins++;
    }
  }

  s.positions[ev.mint] = pos;
  await save(s);
  return summarize(s);
}

/** Top detected smart wallets ranked by realized PnL. */
export async function listSmartWallets(limit = 50): Promise<SmartWalletSummary[]> {
  let all: PersistedStats[] = [];

  if (redis.available()) {
    const raw = await redis.hgetall<string>(REDIS_HASH_KEY);
    if (raw) {
      for (const v of Object.values(raw)) {
        try {
          const parsed: PersistedStats = typeof v === "string" ? JSON.parse(v) : v;
          all.push(parsed);
        } catch {}
      }
    }
  } else {
    all = Array.from(hotCache.values());
  }

  return all
    .filter(s => isSmartWallet(summarize(s)))
    .map(summarize)
    .sort((a, b) => b.realizedPnlSol - a.realizedPnlSol)
    .slice(0, limit);
}

export async function getWalletStats(addr: string): Promise<SmartWalletSummary | null> {
  const s = await load(addr);
  return (s.buys + s.sells) > 0 ? summarize(s) : null;
}

/** Deterministic hue from an address (used for KOL color in the feed). */
export function colorForAddr(addr: string): string {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 55%)`;
}
