import "server-only";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DexPair = any;

export interface DexTokenResponse {
  pairs?: DexPair[] | null;
}

export async function fetchTokenPair(mint: string): Promise<DexPair | null> {
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

export async function fetchLatestProfiles(): Promise<Array<{ tokenAddress: string }>> {
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
