import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NITTER_HOSTS = [
  "https://nitter.privacydev.net",
  "https://nitter.cz",
  "https://nitter.poast.org",
  "https://nitter.net",
];

const NEWS_RSS = [
  "https://cointelegraph.com/rss/tag/altcoin",
  "https://cointelegraph.com/rss/tag/solana",
  "https://decrypt.co/feed",
];

const MEME_KEYWORDS = [
  "meme","memecoin","doge","pepe","shib","bonk","wif","pump.fun","solana meme",
  "elon","grok","ai agent","dogwifhat","popcat","pnut","wen","moon","based",
  "chad","gigachad","ngmi","wagmi","solana launch","new coin","narrative","cashtag",
];

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of MEME_KEYWORDS) {
    if (lower.includes(kw)) { score += 20; break; }
  }
  if (lower.includes("solana")) score += 10;
  if (/\$[a-z]{2,6}/i.test(text)) score += 15;
  if (/🚀|🔥|🐸|🐶|💎|🌙|🤑/.test(text)) score += 10;
  return Math.min(100, score);
}

export interface XSignal {
  id:      string;
  text:    string;
  author:  string;
  url:     string;
  score:   number;
  source:  "x" | "news";
  pubDate: number;
}

function parseRssItems(xml: string, source: "x" | "news", fallbackAuthor: string): XSignal[] {
  const items: XSignal[] = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRx.exec(xml)) !== null) {
    const b = m[1];
    const title  = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(b)?.[1] ?? /<title>([\s\S]*?)<\/title>/.exec(b)?.[1] ?? "").trim();
    const desc   = (/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(b)?.[1] ?? /<description>([\s\S]*?)<\/description>/.exec(b)?.[1] ?? "").replace(/<[^>]+>/g, " ").trim();
    const link   = (/<link>([\s\S]*?)<\/link>/.exec(b)?.[1] ?? "").trim();
    const author = (/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/.exec(b)?.[1] ?? fallbackAuthor).trim();
    const pubRaw = (/<pubDate>([\s\S]*?)<\/pubDate>/.exec(b)?.[1] ?? "").trim();
    const pubDate = pubRaw ? new Date(pubRaw).getTime() : Date.now();

    const text = (title || desc.slice(0, 200)).replace(/\s+/g, " ").trim();
    if (!text) continue;
    const score = scoreText(text);
    if (score < 10) continue;

    items.push({ id: `${source}:${link || title}`, text: text.slice(0, 280), author, url: link, score, source, pubDate });
  }
  return items;
}

async function fetchNitter(path: string): Promise<string | null> {
  for (const host of NITTER_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Geass/1.0)" },
      });
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<item>")) return text;
      }
    } catch { /* try next instance */ }
  }
  return null;
}

const X_ACCOUNTS = ["elonmusk", "MustStopMurad", "blknoiz06", "darkfarms1", "kingkongsol"];
const X_SEARCHES = ["solana+meme+coin", "pump+fun+solana", "solana+narrative"];

export async function GET() {
  const all: XSignal[] = [];

  const nitterJobs = [
    ...X_ACCOUNTS.map(u => fetchNitter(`/${u}/rss`).then(xml => xml ? parseRssItems(xml, "x", `@${u}`) : [])),
    ...X_SEARCHES.map(q => fetchNitter(`/search/rss?q=${q}&f=tweets`).then(xml => xml ? parseRssItems(xml, "x", "X Search") : [])),
  ];

  const newsJobs = NEWS_RSS.map(url =>
    fetch(url, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.text() : "")
      .then(xml => xml ? parseRssItems(xml, "news", "News") : [])
      .catch(() => [] as XSignal[])
  );

  const settled = await Promise.allSettled([...nitterJobs, ...newsJobs]);
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  const seen = new Set<string>();
  const signals = all
    .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .sort((a, b) => b.score - a.score || b.pubDate - a.pubDate)
    .slice(0, 30);

  return NextResponse.json({ signals, fetchedAt: Date.now() });
}
