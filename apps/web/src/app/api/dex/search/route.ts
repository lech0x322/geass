import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ pairs: [] });

  try {
    const r = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return NextResponse.json({ pairs: [] });
    const data = await r.json() as { pairs?: unknown[] };
    // Filter to Solana only, return top 12
    const pairs = (Array.isArray(data.pairs) ? data.pairs : [])
      .filter((p: unknown) => (p as { chainId?: string }).chainId === "solana")
      .slice(0, 12);
    return NextResponse.json({ pairs });
  } catch {
    return NextResponse.json({ pairs: [] });
  }
}
