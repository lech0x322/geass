import { NextRequest, NextResponse } from "next/server";
import type { TradingSignal } from "@/lib/server/aiTradingEngine";
import { GET as memeGET } from "@/app/api/trends/meme/route";
import { GET as trendingGET } from "@/app/api/dex/trending/route";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const maxDuration = 30;

// Aggregate signals from multiple sources. Underlying data routes are invoked
// directly (not via HTTP self-fetch) so this works in any deployment without a
// hardcoded origin.
export async function GET(_req: NextRequest) {
  const signals: TradingSignal[] = [];
  const now = Date.now();

  // ── 1. Meme signals (pump.fun trending) ───────────────────────────────────
  try {
    const r = await memeGET();
    if (r.ok) {
      const { signals: memeList } = await r.json() as {
        signals: {
          address: string; symbol: string; name: string;
          score: number; volume1h: number | null; marketCap: number | null;
          ageHours?: number; createdAt?: number;
        }[]
      };
      for (const m of (memeList ?? []).slice(0, 20)) {
        const ageHours = m.ageHours ?? (m.createdAt ? (now - m.createdAt * 1000) / 3_600_000 : null);
        const confidence = Math.min(95, Math.round(
          (m.score ?? 50) * 0.5 +
          (m.volume1h ? Math.min(30, m.volume1h / 5_000) : 0) +
          (ageHours != null && ageHours < 2 ? 15 : 0)
        ));
        signals.push({
          id:         `meme-${m.address}-${now}`,
          source:     "meme_scan",
          mint:       m.address,
          symbol:     m.symbol,
          name:       m.name,
          confidence,
          direction:  "buy",
          urgency:    confidence >= 75 ? "high" : confidence >= 55 ? "medium" : "low",
          reasons:    [`GEASS score ${m.score}`, m.volume1h ? `1h vol $${(m.volume1h / 1000).toFixed(0)}K` : "new token"].filter(Boolean),
          metadata:   { score: m.score, mcap: m.marketCap ?? undefined, vol24h: m.volume1h ?? undefined, ageHours },
          timestamp:  now,
        });
      }
    }
  } catch {}

  // ── 2. DEXScreener trending (volume surges) ───────────────────────────────
  try {
    const r = await trendingGET();
    if (r.ok) {
      const { tokens } = await r.json() as {
        tokens: {
          address: string; symbol: string; name: string;
          priceChange24: number | null; volume24: number | null;
          liquidity: number | null; marketCap: number | null;
        }[]
      };
      for (const t of (tokens ?? []).slice(0, 15)) {
        const priceChangePct = t.priceChange24 ?? 0;
        const liquidity = t.liquidity ?? 0;
        const confidence = Math.min(92, Math.round(
          40 +
          Math.min(25, priceChangePct > 0 ? priceChangePct / 4 : 0) +
          (liquidity > 50_000 ? 20 : liquidity > 10_000 ? 10 : 0) +
          (t.volume24 && t.volume24 > 100_000 ? 15 : 0)
        ));
        if (confidence < 40) continue;
        signals.push({
          id:         `vol-${t.address}-${now}`,
          source:     "volume_surge",
          mint:       t.address,
          symbol:     t.symbol,
          name:       t.name,
          confidence,
          direction:  priceChangePct >= 0 ? "buy" : "sell",
          urgency:    confidence >= 70 ? "high" : "medium",
          reasons:    [
            priceChangePct !== 0 ? `+${priceChangePct.toFixed(0)}% 24h` : "",
            t.volume24 ? `$${(t.volume24 / 1_000).toFixed(0)}K vol` : "",
            t.liquidity ? `$${(t.liquidity / 1_000).toFixed(0)}K liq` : "",
          ].filter(Boolean),
          metadata:   { mcap: t.marketCap ?? undefined, vol24h: t.volume24 ?? undefined, priceChangePct },
          timestamp:  now,
        });
      }
    }
  } catch {}

  // Sort by confidence desc, deduplicate by mint, limit to 30
  const seen = new Set<string>();
  const deduped = signals
    .sort((a, b) => b.confidence - a.confidence)
    .filter(s => { if (seen.has(s.mint)) return false; seen.add(s.mint); return true; })
    .slice(0, 30);

  return NextResponse.json({ signals: deduped, count: deduped.length, fetchedAt: now });
}
