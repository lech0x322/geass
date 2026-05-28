import { NextRequest, NextResponse } from "next/server";
import { firecrawlEnabled, firecrawlSearch, firecrawlScrape } from "@/lib/server/firecrawl";
import { loadSnapshot, saveSnapshot } from "@/lib/server/firecrawlStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CA_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

const EXCLUDED = new Set([
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
]);

const TTL_MS = 90_000;

interface GemsCache {
  cas: string[];
  fetchedAt: number;
}

function extractCAs(text: string): string[] {
  return (text.match(CA_REGEX) ?? []).filter((ca) => !EXCLUDED.has(ca));
}

export async function GET(req: NextRequest) {
  if (!firecrawlEnabled()) {
    return NextResponse.json({ error: "Firecrawl not configured" }, { status: 503 });
  }

  const source = req.nextUrl.searchParams.get("source") ?? "all";

  const cached = await loadSnapshot<GemsCache>("gems-cache");
  if (cached && Date.now() - cached.data.fetchedAt < TTL_MS) {
    const { cas, fetchedAt } = cached.data;
    return NextResponse.json({ cas, total: cas.length, fetchedAt });
  }

  const seen = new Set<string>();
  const cas: string[] = [];

  function collect(text: string | undefined) {
    if (!text) return;
    for (const ca of extractCAs(text)) {
      if (!seen.has(ca)) {
        seen.add(ca);
        cas.push(ca);
      }
    }
  }

  const useDex = source === "all" || source === "dexscreener";
  const usePump = source === "all" || source === "pump";

  const [dexHits, pumpResult] = await Promise.all([
    useDex
      ? firecrawlSearch("new solana token contract address dexscreener trending", {
          limit: 10,
          scrapeContent: true,
        })
      : Promise.resolve([]),
    usePump
      ? firecrawlScrape("https://pump.fun", {
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 2000,
        })
      : Promise.resolve(null),
  ]);

  for (const hit of dexHits) {
    collect(hit.markdown);
  }

  if (pumpResult) {
    collect(pumpResult.markdown);
  }

  const fetchedAt = Date.now();
  await saveSnapshot<GemsCache>("gems-cache", { cas, fetchedAt });

  return NextResponse.json({ cas, total: cas.length, fetchedAt });
}
