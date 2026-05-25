import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET() {
  // Primary: Binance (no rate-limit for public ticker)
  try {
    const r = await fetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT",
      { signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const d = await r.json() as { lastPrice: string; priceChangePercent: string };
      const price  = parseFloat(d.lastPrice);
      const change = parseFloat(d.priceChangePercent);
      if (price > 0) return NextResponse.json({ price, change });
    }
  } catch {}

  // Fallback: CoinGecko
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 30 }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const d = await r.json() as { solana?: { usd?: number; usd_24h_change?: number } };
      return NextResponse.json({ price: d.solana?.usd ?? null, change: d.solana?.usd_24h_change ?? 0 });
    }
  } catch {}

  return NextResponse.json({ price: null, change: 0 });
}
