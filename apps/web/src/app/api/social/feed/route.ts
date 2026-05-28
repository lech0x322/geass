import { NextRequest, NextResponse } from "next/server";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

// ── Nitter instances (tried in order, first success wins) ─────────────────────

const NITTER_HOSTS = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.1d4.us",
  "https://nitter.cz",
];

// ── Solana CA detection ────────────────────────────────────────────────────────

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

// ── Types ──────────────────────────────────────────────────────────────────────

export interface XTweet {
  id:      string;
  handle:  string;
  text:    string;
  pubDate: number;   // ms
  url:     string;
  cas:     string[]; // detected Solana CAs
  isRT:    boolean;
  imgUrl:  string | null;
}

// ── RSS fetch + parse ─────────────────────────────────────────────────────────

async function fetchRSS(handle: string): Promise<string | null> {
  for (const host of NITTER_HOSTS) {
    try {
      const r = await fetch(`${host}/${handle}/rss`, {
        headers: { "User-Agent": "GEASS-SocialBot/1.0" },
        signal:  AbortSignal.timeout(5000),
        cache:   "no-store",
      });
      if (r.ok) {
        const text = await r.text();
        if (text.includes("<rss")) return text;
      }
    } catch { /* try next host */ }
  }
  return null;
}

function parseRSS(xml: string, handle: string): XTweet[] {
  const tweets: XTweet[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];

    const extractTag = (tag: string) =>
      block.match(new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1]
      ?? block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]
      ?? "";

    const title      = extractTag("title");
    const link       = extractTag("link").trim();
    const pubDateStr = extractTag("pubDate");
    const desc       = extractTag("description");

    const clean = (s: string) =>
      s.replace(/<[^>]+>/g, " ")
       .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
       .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

    const text    = clean(title + " " + desc).slice(0, 560);
    const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();
    const imgUrl  = desc.match(/src="([^"]+\.(jpg|jpeg|png|gif|webp)[^"]*)"/i)?.[1] ?? null;
    const id      = link || `${handle}-${pubDate}`;
    const isRT    = title.trim().startsWith("RT @") || desc.includes("retweet");

    tweets.push({ id, handle, text, pubDate, url: link, cas: extractCAs(text), isRT, imgUrl });
  }

  return tweets;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const qs    = req.nextUrl.searchParams;
  const raw   = qs.get("handles") ?? "";
  const limit = Math.min(Number(qs.get("limit") ?? "60"), 120);
  const noRT  = qs.get("noRT") === "1";

  const handles = raw.split(",").map(h => h.trim().replace(/^@/, "")).filter(Boolean);
  if (!handles.length) return NextResponse.json({ error: "handles required" }, { status: 400 });

  // Fetch all handles in parallel, batched to avoid rate-limits
  const BATCH = 8;
  const all: XTweet[] = [];

  for (let i = 0; i < handles.length; i += BATCH) {
    const batch  = handles.slice(i, i + BATCH);
    const xmlArr = await Promise.all(batch.map(h => fetchRSS(h)));
    for (let j = 0; j < batch.length; j++) {
      if (xmlArr[j]) all.push(...parseRSS(xmlArr[j]!, batch[j]));
    }
  }

  const tweets = all
    .filter(t => !noRT || !t.isRT)
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, limit);

  return NextResponse.json({ tweets, total: tweets.length, fetchedAt: Date.now() });
}
