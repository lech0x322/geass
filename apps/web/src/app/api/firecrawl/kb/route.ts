import { NextRequest, NextResponse } from "next/server";
import { firecrawlEnabled, firecrawlSearch } from "@/lib/server/firecrawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!firecrawlEnabled()) {
    return NextResponse.json({ error: "Firecrawl not configured" }, { status: 503 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Missing required query param: q" }, { status: 400 });
  }

  const [broadHits, docsHits] = await Promise.all([
    firecrawlSearch(q + " solana blockchain", { limit: 5, scrapeContent: true }),
    firecrawlSearch(q + " site:docs.solana.com OR site:station.jup.ag", {
      limit: 3,
      scrapeContent: false,
    }),
  ]);

  const seen = new Set<string>();
  const merged: Array<{ url: string; title: string; description: string; markdown: string }> = [];

  for (const hit of [...broadHits, ...docsHits]) {
    if (seen.has(hit.url) || merged.length >= 8) continue;
    seen.add(hit.url);
    merged.push({
      url: hit.url,
      title: hit.title ?? "",
      description: hit.description ?? "",
      markdown: (hit.markdown ?? "").slice(0, 2000),
    });
  }

  return NextResponse.json({
    results: merged,
    total: merged.length,
    query: q,
    fetchedAt: Date.now(),
  });
}
