import "server-only";
import { cached } from "./cache";

export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  url: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceNative: string;
  priceUsd: string | null;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: { h24: number; h6: number; h1: number; m5: number };
  priceChange: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity: { usd: number; base: number; quote: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
}

export interface DexTokenInfo {
  mint: string;
  pair: DexPair | null;
  priceUsd: number | null;
  priceNative: number | null;
  vol24h: number;
  vol1h: number;
  liqUsd: number;
  priceChange1h: number;
  priceChange24h: number;
  buys1h: number;
  sells1h: number;
  mcap: number | null;
  dexUrl: string | null;
}

const BASE = "https://api.dexscreener.com";

function bestPair(pairs: DexPair[]): DexPair | null {
  const sol = pairs.filter(p => p.chainId === "solana");
  return sol.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null;
}

function pairToInfo(mint: string, pair: DexPair | null): DexTokenInfo {
  if (!pair) return { mint, pair: null, priceUsd: null, priceNative: null, vol24h: 0, vol1h: 0, liqUsd: 0, priceChange1h: 0, priceChange24h: 0, buys1h: 0, sells1h: 0, mcap: null, dexUrl: null };
  return {
    mint,
    pair,
    priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
    priceNative: pair.priceNative ? Number(pair.priceNative) : null,
    vol24h: pair.volume?.h24 ?? 0,
    vol1h: pair.volume?.h1 ?? 0,
    liqUsd: pair.liquidity?.usd ?? 0,
    priceChange1h: pair.priceChange?.h1 ?? 0,
    priceChange24h: pair.priceChange?.h24 ?? 0,
    buys1h: pair.txns?.h1?.buys ?? 0,
    sells1h: pair.txns?.h1?.sells ?? 0,
    mcap: pair.marketCap ?? pair.fdv ?? null,
    dexUrl: pair.url ?? null,
  };
}

// Fetch up to 30 mints in a single call using the new batch endpoint.
async function fetchBatchUncached(mints: string[]): Promise<Map<string, DexTokenInfo>> {
  const result = new Map<string, DexTokenInfo>();
  if (!mints.length) return result;

  // API allows up to 30 addresses per request, comma-separated.
  const chunks: string[][] = [];
  for (let i = 0; i < mints.length; i += 30) chunks.push(mints.slice(i, i + 30));

  await Promise.all(chunks.map(async chunk => {
    try {
      const r = await fetch(`${BASE}/tokens/v1/solana/${chunk.join(",")}`, {
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) return;
      const data: { pairs?: DexPair[] } = await r.json();
      const pairs = data.pairs ?? [];

      // Group pairs by baseToken address
      const byMint = new Map<string, DexPair[]>();
      for (const p of pairs) {
        const addr = p.baseToken?.address;
        if (!addr) continue;
        if (!byMint.has(addr)) byMint.set(addr, []);
        byMint.get(addr)!.push(p);
      }
      for (const mint of chunk) {
        const best = bestPair(byMint.get(mint) ?? []);
        result.set(mint, pairToInfo(mint, best));
      }
    } catch {}
  }));

  return result;
}

export async function fetchDexBatch(mints: string[]): Promise<Map<string, DexTokenInfo>> {
  return fetchBatchUncached(mints);
}

// Single-mint helper with 8-second cache.
async function fetchSingleUncached(mint: string): Promise<DexTokenInfo> {
  const batch = await fetchBatchUncached([mint]);
  return batch.get(mint) ?? pairToInfo(mint, null);
}

export function fetchDexToken(mint: string): Promise<DexTokenInfo> {
  return cached(`dex:v2:${mint}`, 8_000, () => fetchSingleUncached(mint));
}

// Keep legacy helpers for backward-compat with scanner.
export async function fetchTokenPair(mint: string): Promise<DexPair | null> {
  const info = await fetchDexToken(mint);
  return info.pair;
}

async function fetchLatestProfilesUncached(): Promise<Array<{ tokenAddress: string }>> {
  try {
    const r = await fetch(`${BASE}/token-profiles/latest/v1`, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return [];
    const raw = await r.json();
    const arr: Array<{ chainId?: string; tokenAddress?: string }> = Array.isArray(raw) ? raw : (raw.data ?? []);
    return arr.filter(p => p.chainId === "solana") as Array<{ tokenAddress: string }>;
  } catch {
    return [];
  }
}

export function fetchLatestProfiles(): Promise<Array<{ tokenAddress: string }>> {
  return cached("dex:profiles:latest", 10_000, fetchLatestProfilesUncached);
}
