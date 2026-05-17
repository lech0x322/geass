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
