import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!address) return NextResponse.json({ pairs: [] });

  try {
    const r = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${address}`,
      { next: { revalidate: 30 }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return NextResponse.json({ pairs: [] });
    const data = await r.json();
    // Sort by liquidity descending
    const pairs = (Array.isArray(data) ? data : (data?.pairs ?? []))
      .sort((a: { liquidity?: { usd?: number } }, b: { liquidity?: { usd?: number } }) =>
        (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
      )
      .slice(0, 10);
    return NextResponse.json({ pairs });
  } catch {
    return NextResponse.json({ pairs: [] });
  }
}
