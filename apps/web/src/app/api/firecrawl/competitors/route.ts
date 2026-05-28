import { NextResponse } from "next/server";
import { firecrawlEnabled, firecrawlScrape } from "@/lib/server/firecrawl";
import { loadSnapshot, saveSnapshot } from "@/lib/server/firecrawlStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TARGETS = [
  { name: "axiom",  url: "https://axiom.trade" },
  { name: "photon", url: "https://photon-sol.tren.sh" },
  { name: "bullx",  url: "https://bullx.io" },
  { name: "gmgn",   url: "https://gmgn.ai" },
];

const TTL_MS = 10 * 60 * 1000;

type SnapshotEntry = { snippet: string; hash: string; fetchedAt: number };
type CompetitorsSnapshot = Record<string, SnapshotEntry>;

function makeHash(snippet: string): string {
  return snippet.slice(0, 200) + String(snippet.length);
}

export async function GET() {
  if (!firecrawlEnabled()) {
    return NextResponse.json({ error: "Firecrawl not configured" }, { status: 503 });
  }

  const cached = await loadSnapshot<CompetitorsSnapshot & { _fetchedAt: number }>("competitors-last");
  if (cached && Date.now() - cached.savedAt < TTL_MS) {
    const snap = cached.data;
    const results = TARGETS.map(({ name, url }) => {
      const entry = snap[name];
      return { name, url, snippet: entry?.snippet ?? "", changed: false, fetchedAt: entry?.fetchedAt ?? cached.savedAt };
    });
    return NextResponse.json({ results, fetchedAt: cached.savedAt });
  }

  const prev = cached?.data ?? ({} as CompetitorsSnapshot);

  const scrapeResults = await Promise.all(
    TARGETS.map(({ url }) =>
      firecrawlScrape(url, {
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 1500,
        timeout: 25000,
      }),
    ),
  );

  const fetchedAt = Date.now();
  const newSnap: CompetitorsSnapshot = {};

  const results = TARGETS.map(({ name, url }, i) => {
    const markdown = scrapeResults[i]?.markdown ?? "";
    const snippet = markdown.slice(0, 1000);
    const hash = makeHash(snippet);
    const prevHash = prev[name]?.hash ?? null;
    const changed = prevHash !== null && prevHash !== hash;
    newSnap[name] = { snippet, hash, fetchedAt };
    return { name, url, snippet, changed, fetchedAt };
  });

  await saveSnapshot<CompetitorsSnapshot>("competitors-last", newSnap);

  return NextResponse.json({ results, fetchedAt });
}
