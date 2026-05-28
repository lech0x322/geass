import { FIRECRAWL_API_KEY } from "@/lib/env";

const FC_BASE = "https://api.firecrawl.dev/v2";

interface ScrapeOpts {
  formats?:         ("markdown" | "html" | "links")[];
  onlyMainContent?: boolean;
  waitFor?:         number;
  timeout?:         number;
  proxy?:           "basic" | "stealth";
}

interface ScrapeResult {
  markdown?: string;
  html?:     string;
  links?:    string[];
  metadata?: Record<string, unknown>;
}

export function firecrawlEnabled(): boolean {
  return FIRECRAWL_API_KEY.length > 0;
}

export async function firecrawlScrape(
  url: string,
  opts: ScrapeOpts = {},
): Promise<ScrapeResult | null> {
  if (!firecrawlEnabled()) return null;
  try {
    const r = await fetch(`${FC_BASE}/scrape`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats:         opts.formats         ?? ["markdown"],
        onlyMainContent: opts.onlyMainContent ?? true,
        waitFor:         opts.waitFor         ?? 0,
        proxy:           opts.proxy           ?? "basic",
      }),
      signal: AbortSignal.timeout(opts.timeout ?? 30_000),
    });
    if (!r.ok) return null;
    const json = await r.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

interface SearchOpts {
  limit?:         number;
  scrapeContent?: boolean;
  timeout?:       number;
}

interface SearchHit {
  url:          string;
  title?:       string;
  description?: string;
  markdown?:    string;
}

export async function firecrawlSearch(
  query: string,
  opts: SearchOpts = {},
): Promise<SearchHit[]> {
  if (!firecrawlEnabled()) return [];
  try {
    const body: Record<string, unknown> = { query, limit: opts.limit ?? 10 };
    if (opts.scrapeContent) body.scrapeOptions = { formats: ["markdown"], onlyMainContent: true };
    const r = await fetch(`${FC_BASE}/search`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeout ?? 30_000),
    });
    if (!r.ok) return [];
    const json = await r.json();
    return json?.data?.web ?? json?.data ?? [];
  } catch {
    return [];
  }
}
