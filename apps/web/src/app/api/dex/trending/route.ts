import { NextResponse } from "next/server";

interface Boost {
  url: string;
  chainId: string;
  tokenAddress: string;
  amount: number;
  totalAmount: number;
  icon: string | null;
  description: string | null;
}

interface DexPair {
  chainId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd: string | null;
  volume: Record<string, number>;
  priceChange: Record<string, number> | null;
  liquidity: { usd: number | null } | null;
  fdv: number | null;
  marketCap: number | null;
  info?: { imageUrl?: string | null } | null;
}

export interface TrendingToken {
  address:       string;
  symbol:        string;
  name:          string;
  priceUsd:      number | null;
  priceChange24: number | null;
  volume24:      number | null;
  liquidity:     number | null;
  marketCap:     number | null;
  icon:          string | null;
  boostAmount:   number;
  dexUrl:        string;
}

export interface TrendingMeta {
  name:        string;
  slug:        string;
  icon:        { type: string; value: string } | null;
  marketCap:   number;
  volume:      number;
  liquidity:   number;
  tokenCount:  number;
  mcChange24:  number;
}

export async function GET() {
  try {
    const [boostRes, metaRes] = await Promise.all([
      fetch("https://api.dexscreener.com/token-boosts/top/v1", {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      }),
      fetch("https://api.dexscreener.com/metas/trending/v1", {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    // ── Trending metas ─────────────────────────────────────────
    const metas: TrendingMeta[] = [];
    if (metaRes.ok) {
      const raw = await metaRes.json() as { name: string; slug: string; icon?: { type: string; value: string }; marketCap?: number; volume?: number; liquidity?: number; tokenCount?: number; marketCapChange?: { h24?: number } }[];
      for (const m of (Array.isArray(raw) ? raw : []).slice(0, 12)) {
        metas.push({
          name:       m.name,
          slug:       m.slug,
          icon:       m.icon ?? null,
          marketCap:  m.marketCap ?? 0,
          volume:     m.volume ?? 0,
          liquidity:  m.liquidity ?? 0,
          tokenCount: m.tokenCount ?? 0,
          mcChange24: m.marketCapChange?.h24 ?? 0,
        });
      }
    }

    // ── Top boosted Solana tokens ──────────────────────────────
    let tokens: TrendingToken[] = [];
    if (boostRes.ok) {
      const boosts = await boostRes.json() as Boost[];
      const solBoosts = boosts.filter(b => b.chainId === "solana").slice(0, 20);

      if (solBoosts.length) {
        const addresses = solBoosts.map(b => b.tokenAddress).join(",");
        const pairsRes = await fetch(
          `https://api.dexscreener.com/tokens/v1/solana/${addresses}`,
          { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) },
        );

        const pairsMap = new Map<string, DexPair>();
        if (pairsRes.ok) {
          const raw = await pairsRes.json();
          const pairs: DexPair[] = Array.isArray(raw) ? raw : (raw?.pairs ?? []);
          for (const pair of pairs) {
            const addr = pair.baseToken.address;
            const existing = pairsMap.get(addr);
            if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
              pairsMap.set(addr, pair);
            }
          }
        }

        tokens = solBoosts.map(boost => {
          const pair = pairsMap.get(boost.tokenAddress);
          return {
            address:       boost.tokenAddress,
            symbol:        pair?.baseToken.symbol ?? boost.tokenAddress.slice(0, 6).toUpperCase(),
            name:          pair?.baseToken.name   ?? "Unknown",
            priceUsd:      pair?.priceUsd ? parseFloat(pair.priceUsd) : null,
            priceChange24: pair?.priceChange?.h24 ?? null,
            volume24:      pair?.volume?.h24 ?? null,
            liquidity:     pair?.liquidity?.usd ?? null,
            marketCap:     pair?.marketCap ?? null,
            icon:          boost.icon ?? pair?.info?.imageUrl ?? null,
            boostAmount:   boost.totalAmount,
            dexUrl:        boost.url,
          };
        });
      }
    }

    return NextResponse.json({ tokens, metas });
  } catch {
    return NextResponse.json({ tokens: [], metas: [] });
  }
}
