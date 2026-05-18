import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET() {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 30 }, signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return NextResponse.json({ price: null, change: 0 });
    const d = await r.json() as { solana?: { usd?: number; usd_24h_change?: number } };
    return NextResponse.json({ price: d.solana?.usd ?? null, change: d.solana?.usd_24h_change ?? 0 });
  } catch {
    return NextResponse.json({ price: null, change: 0 });
  }
}
