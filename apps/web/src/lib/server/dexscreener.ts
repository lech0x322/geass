import "server-only";
import { cached } from "./cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DexPair = any;

export interface DexTokenResponse {
  pairs?: DexPair[] | null;
}

async function fetchTokenPairUncached(mint: string): Promise<DexPair | null> {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return null;
    const d: DexTokenResponse = await r.json();
    const pairs = (d.pairs || []).filter((p: DexPair) => p?.chainId === "solana");
    return pairs.sort(
      (a: DexPair, b: DexPair) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0),
    )[0] ?? null;
  } catch {
    return null;
  }
}

export function fetchTokenPair(mint: string): Promise<DexPair | null> {
  return cached(`dex:pair:${mint}`, 8_000, () => fetchTokenPairUncached(mint));
}

async function fetchLatestProfilesUncached(): Promise<Array<{ tokenAddress: string }>> {
  try {
    const r = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return [];
    const raw = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any[] = Array.isArray(raw) ? raw : (raw.data || []);
    return arr.filter(p => p.chainId === "solana");
  } catch {
    return [];
  }
}

export function fetchLatestProfiles(): Promise<Array<{ tokenAddress: string }>> {
  return cached("dex:profiles:latest", 10_000, fetchLatestProfilesUncached);
}

// ── Pump.fun new token feed ───────────────────────────────────────────────────
// pump.fun public API sorted by creation_time returns genuinely new tokens
// (seconds to minutes old), unlike token-profiles which returns old tokens
// that just updated their logo/socials.

export interface PumpNewToken {
  mint:         string;
  name:         string;
  symbol:       string;
  createdAt:    number; // ms epoch
  usdMarketCap: number;
}

async function fetchNewPumpTokensUncached(): Promise<PumpNewToken[]> {
  try {
    const r = await fetch(
      "https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=creation_time&order=DESC&includeNsfw=true",
      {
        signal:  AbortSignal.timeout(8_000),
        cache:   "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (!r.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any[] = await r.json();
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - 4 * 60 * 60 * 1000; // discard anything older than 4h
    return arr
      .map(c => ({
        mint:         c.mint as string,
        name:         (c.name  ?? "Unknown") as string,
        symbol:       (c.symbol ?? "???") as string,
        createdAt:    c.created_timestamp ? Number(c.created_timestamp) * 1000 : Date.now(),
        usdMarketCap: Number(c.usd_market_cap ?? 0),
      }))
      .filter(t => t.mint && t.createdAt >= cutoff)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function fetchNewPumpTokens(): Promise<PumpNewToken[]> {
  return cached("pump:new-tokens", 15_000, fetchNewPumpTokensUncached);
}
