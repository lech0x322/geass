import { NextRequest, NextResponse } from "next/server";
import { firecrawlScrape, firecrawlEnabled } from "@/lib/server/firecrawl";
import { loadSnapshot, saveSnapshot } from "@/lib/server/firecrawlStore";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const SOL_CA_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
const EXCLUDE = new Set([
  "So11111111111111111111111111111111111111112",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "11111111111111111111111111111111",
]);

function extractCAs(text: string): string[] {
  const all = [...text.matchAll(SOL_CA_RE)].map(m => m[0]);
  return [...new Set(all.filter(ca => ca.length >= 32 && ca.length <= 44 && !EXCLUDE.has(ca)))];
}

interface SeenState {
  [handle: string]: { cas: string[]; lastSeen: number };
}

interface KolHit {
  handle:  string;
  ca:      string;
  url:     string;
  ts:      number;
}

async function scrapeHandle(handle: string): Promise<string[]> {
  const res = await firecrawlScrape(`https://x.com/${handle}`, {
    formats:         ["markdown"],
    onlyMainContent: true,
    waitFor:         2500,
    timeout:         20_000,
  });
  if (!res?.markdown) return [];
  return extractCAs(res.markdown);
}

export async function GET(req: NextRequest) {
  if (!firecrawlEnabled()) {
    return NextResponse.json({ error: "FIRECRAWL_API_KEY not configured" }, { status: 503 });
  }

  const qs = req.nextUrl.searchParams;
  const handles = (qs.get("handles") ?? "")
    .split(",").map(h => h.trim().replace(/^@/, "")).filter(Boolean);
  if (!handles.length) {
    return NextResponse.json({ error: "handles required" }, { status: 400 });
  }

  const snap = await loadSnapshot<SeenState>("kol-seen-cas");
  const seen: SeenState = snap?.data ?? {};
  const hits: KolHit[] = [];
  const now = Date.now();

  const BATCH = 6;
  for (let i = 0; i < handles.length; i += BATCH) {
    const batch = handles.slice(i, i + BATCH);
    const cas = await Promise.all(batch.map(h => scrapeHandle(h)));
    for (let j = 0; j < batch.length; j++) {
      const handle = batch[j];
      const fresh  = cas[j];
      const prior  = new Set(seen[handle]?.cas ?? []);
      const newOnes = fresh.filter(c => !prior.has(c));
      for (const ca of newOnes) {
        hits.push({ handle, ca, url: `https://x.com/${handle}`, ts: now });
      }
      seen[handle] = {
        cas:      [...new Set([...(seen[handle]?.cas ?? []), ...fresh])].slice(-100),
        lastSeen: now,
      };
    }
  }

  await saveSnapshot("kol-seen-cas", seen);
  return NextResponse.json({ hits, total: hits.length, fetchedAt: now });
}
