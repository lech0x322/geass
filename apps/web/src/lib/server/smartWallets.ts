import "server-only";

/**
 * Auto-discovered "smart wallet" registry.
 *
 * Fed by the Helius webhook subscribed to the Pump.fun program. Each pump
 * swap updates per-wallet stats; wallets that cross the SMART_WALLET_*
 * thresholds are promoted to "detected KOLs" and surfaced in the KOL feed.
 *
 * In-memory only — restart loses state. Swap for Redis/Postgres for prod.
 */

export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

export const SMART_WALLET_MIN_TRADE_SOL = 0.1;
export const SMART_WALLET_MIN_VOLUME_SOL = 10;
export const SMART_WALLET_MIN_TRADES = 5;
export const SMART_WALLET_MIN_WINRATE = 0.55;

interface Position {
  /** Total SOL spent acquiring this mint (cost basis). */
  costSol: number;
  /** Token units still held (raw, no decimals adjustment). */
  tokens: number;
}

export interface WalletStats {
  addr: string;
  buys: number;
  sells: number;
  volumeSol: number;
  realizedPnlSol: number;
  /** Trades that closed in profit (realizedPnl > 0). */
  wins: number;
  /** Trades that closed (sells). */
  closed: number;
  mints: Set<string>;
  firstSeen: number;
  lastSeen: number;
  positions: Map<string, Position>;
}

const wallets = new Map<string, WalletStats>();
const MAX_WALLETS = 5000;

function getOrCreate(addr: string): WalletStats {
  let s = wallets.get(addr);
  if (!s) {
    if (wallets.size >= MAX_WALLETS) {
      // Evict the least-recently-seen wallet to bound memory.
      let oldestAddr = "";
      let oldest = Infinity;
      for (const [k, v] of wallets) {
        if (v.lastSeen < oldest) { oldest = v.lastSeen; oldestAddr = k; }
      }
      if (oldestAddr) wallets.delete(oldestAddr);
    }
    s = {
      addr, buys: 0, sells: 0, volumeSol: 0, realizedPnlSol: 0,
      wins: 0, closed: 0, mints: new Set(), firstSeen: Date.now(), lastSeen: Date.now(),
      positions: new Map(),
    };
    wallets.set(addr, s);
  }
  return s;
}

export interface PumpTradeEvent {
  wallet: string;
  mint: string;
  side: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  ts: number;
}

/** Record a pump.fun swap and return updated stats. */
export function recordTrade(ev: PumpTradeEvent): WalletStats | null {
  if (ev.solAmount < SMART_WALLET_MIN_TRADE_SOL) return null;
  const s = getOrCreate(ev.wallet);
  s.lastSeen = ev.ts;
  s.volumeSol += ev.solAmount;
  s.mints.add(ev.mint);

  const pos = s.positions.get(ev.mint) ?? { costSol: 0, tokens: 0 };

  if (ev.side === "buy") {
    s.buys++;
    pos.costSol += ev.solAmount;
    pos.tokens += ev.tokenAmount;
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
      pos.tokens = Math.max(0, pos.tokens - ev.tokenAmount);
    } else {
      // Sold without a tracked entry — treat as pure gain (we didn't see the buy).
      s.realizedPnlSol += ev.solAmount;
      s.wins++;
    }
  }

  s.positions.set(ev.mint, pos);
  return s;
}

export function isSmartWallet(s: WalletStats): boolean {
  const trades = s.buys + s.sells;
  if (s.volumeSol < SMART_WALLET_MIN_VOLUME_SOL) return false;
  if (trades < SMART_WALLET_MIN_TRADES) return false;
  if (s.closed === 0) return trades >= SMART_WALLET_MIN_TRADES * 2; // pre-PnL phase: require more activity
  const winRate = s.wins / s.closed;
  return winRate >= SMART_WALLET_MIN_WINRATE;
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

function summarize(s: WalletStats): SmartWalletSummary {
  const trades = s.buys + s.sells;
  return {
    addr: s.addr,
    trades,
    volumeSol: Number(s.volumeSol.toFixed(3)),
    realizedPnlSol: Number(s.realizedPnlSol.toFixed(3)),
    winRate: s.closed ? Number((s.wins / s.closed).toFixed(3)) : 0,
    uniqueMints: s.mints.size,
    firstSeen: s.firstSeen,
    lastSeen: s.lastSeen,
  };
}

/** Top detected smart wallets ranked by realized PnL. */
export function listSmartWallets(limit = 50): SmartWalletSummary[] {
  const out: SmartWalletSummary[] = [];
  for (const s of wallets.values()) {
    if (isSmartWallet(s)) out.push(summarize(s));
  }
  out.sort((a, b) => b.realizedPnlSol - a.realizedPnlSol);
  return out.slice(0, limit);
}

export function getWalletStats(addr: string): SmartWalletSummary | null {
  const s = wallets.get(addr);
  return s ? summarize(s) : null;
}

/** Deterministic hue from an address (used for KOL color). */
export function colorForAddr(addr: string): string {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 55%)`;
}
