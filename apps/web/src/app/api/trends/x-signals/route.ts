import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEWS_SOURCES: { url: string; name: string; icon: string }[] = [
  { url: "https://cointelegraph.com/rss",                   name: "CoinTelegraph", icon: "🟠" },
  { url: "https://cointelegraph.com/rss/tag/altcoin",       name: "CoinTelegraph", icon: "🟠" },
  { url: "https://cointelegraph.com/rss/tag/solana",        name: "CoinTelegraph", icon: "🟠" },
  { url: "https://decrypt.co/feed",                         name: "Decrypt",       icon: "🔵" },
  { url: "https://thedefiant.io/feed",                      name: "The Defiant",   icon: "⚡" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", name: "CoinDesk",      icon: "📰" },
  { url: "https://bitcoinmagazine.com/.rss/full/",          name: "BTC Magazine",  icon: "🟡" },
];

// Only strict memecoin / meme-token keywords — articles without these are excluded
const RELEVANCE_KEYWORDS = [
  "memecoin","meme coin","meme token","pump.fun","doge","pepe","shib","bonk","wif",
  "dog coin","cat coin","frog","rug pull","airdrop","solana meme","token launch",
  "new token","100x","alpha","degen","kol","narrative","meme rally","meme season",
  "memecoin season","viral token","moonshot","on-chain meme",
];

function scoreArticle(title: string, desc: string): number {
  const text = `${title} ${desc}`.toLowerCase();
  let score = 5;
  for (const kw of RELEVANCE_KEYWORDS) {
    if (text.includes(kw)) { score += 18; break; }
  }
  if (/\$[a-z]{2,8}/i.test(text)) score += 12;
  if (/solana/i.test(text))        score += 10;
  if (/meme/i.test(text))          score += 10;
  return Math.min(100, score);
}

export interface XSignal {
  id:      string;
  text:    string;
  author:  string;
  url:     string;
  score:   number;
  source:  "news";
  icon:    string;
  pubDate: number;
}

function parseRssItems(xml: string, sourceName: string, icon: string): XSignal[] {
  const items: XSignal[] = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRx.exec(xml)) !== null) {
    const b = m[1];
    const title  = (/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(b)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
    const desc   = (/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/.exec(b)?.[1] ?? "").replace(/<[^>]+>/g, " ").trim();
    const link   = (/<link>([\s\S]*?)<\/link>/.exec(b)?.[1] ?? "").trim();
    const pubRaw = (/<pubDate>([\s\S]*?)<\/pubDate>/.exec(b)?.[1] ?? "").trim();
    const pubDate = pubRaw ? new Date(pubRaw).getTime() : Date.now();
    if (!title) continue;
    const score = scoreArticle(title, desc.slice(0, 200));
    items.push({ id: `news:${link || title}`, text: title.slice(0, 200), author: sourceName, url: link, score, source: "news", icon, pubDate });
  }
  return items;
}

export async function GET() {
  const jobs = NEWS_SOURCES.map(src =>
    fetch(src.url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Geass/1.0)" },
    })
      .then(r => r.ok ? r.text() : "")
      .then(xml => xml ? parseRssItems(xml, src.name, src.icon) : [])
      .catch(() => [] as XSignal[])
  );

  const settled = await Promise.allSettled(jobs);
  const all: XSignal[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  const seen = new Set<string>();
  const signals = all
    .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .filter(s => s.score >= 23) // drop articles without any meme keyword
    .sort((a, b) => b.score - b.score || b.pubDate - a.pubDate)
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 30);

  return NextResponse.json({ signals, fetchedAt: Date.now() });
}
