import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEME_KEYWORDS = [
  "dog","doge","shib","pepe","cat","frog","ape","moon","elon","musk","trump","grok",
  "wojak","chad","based","meme","pump","gigachad","bonk","wif","popcat","pnut","ponke",
  "harambe","goat","zeus","baby","sir","cope","shill","npc","ai","gm","wen","lambo",
  "rug","sus","ngmi","wagmi","fud","bear","bull","crab","monkey","snake","pig",
];

const NARRATIVE_CLUSTERS = [
  { id: "dog",       keywords: ["dog","doge","shib","bonk","wif","puppy","husky","poodle","corgi","shiba"],   label: "🐕 Dog Memes",   color: "#f97316" },
  { id: "frog",      keywords: ["frog","pepe","kek","toad","ribbit","wojak","apu"],                            label: "🐸 Frog / Pepe", color: "#10b981" },
  { id: "cat",       keywords: ["cat","kitty","kitten","meow","nyan","popcat","pussy","tabby"],                label: "🐱 Cat Coins",   color: "#a855f7" },
  { id: "ai",        keywords: ["ai","agent","gpt","robot","neural","machine","skynet","agi","llm","bot"],     label: "🤖 AI Agents",   color: "#3b82f6" },
  { id: "political", keywords: ["trump","elon","musk","biden","grok","maga","based","barron","vivek"],        label: "🏛️ Political",   color: "#ef4444" },
  { id: "animal",    keywords: ["ape","monkey","bear","bull","snake","panda","gorilla","rat","hamster","pnut","goat","zeus","camel","whale","shark","wolf","bat","bee"], label: "🦍 Animals", color: "#eab308" },
  { id: "culture",   keywords: ["chad","gigachad","npc","cope","simp","giga","wagmi","ngmi","wen","lambo","gm","ser","fren"], label: "💪 CT Culture", color: "#ec4899" },
];

function scoreMeme(name: string, symbol: string, replyCount: number, volume: number): number {
  const combined = `${name} ${symbol}`.toLowerCase();
  let score = 0;
  for (const kw of MEME_KEYWORDS) {
    if (combined.includes(kw)) { score += 15; break; }
  }
  if (symbol.length <= 4)   score += 10;
  if (replyCount > 100)     score += 20;
  else if (replyCount > 30) score += 10;
  if (volume > 50_000)      score += 30;
  else if (volume > 5_000)  score += 15;
  else if (volume > 500)    score += 5;
  return Math.min(100, score);
}

function matchNarrative(name: string, symbol: string): string | null {
  const combined = `${name} ${symbol}`.toLowerCase();
  for (const cluster of NARRATIVE_CLUSTERS) {
    if (cluster.keywords.some(kw => combined.includes(kw))) return cluster.id;
  }
  return null;
}

export interface MemeSignal {
  address:     string;
  name:        string;
  symbol:      string;
  score:       number;
  volume1h:    number | null;
  marketCap:   number | null;
  replyCount:  number;
  description: string | null;
  icon:        string | null;
  pumpUrl:     string;
  createdAt:   number;
}

export interface NarrativeStat {
  id:        string;
  label:     string;
  color:     string;
  count:     number;
  totalVol:  number;
  topSymbol: string;
  topIcon:   string | null;
  momentum:  number;
}

type PumpCoin = {
  mint: string; name: string; symbol: string;
  description?: string; image_uri?: string;
  usd_market_cap?: number; reply_count?: number; created_timestamp?: number;
};
type PumpTrade = { mint: string; sol_amount?: number; is_buy?: boolean; timestamp?: number; };

export async function GET() {
  try {
    const [coinsRes, tradesRes] = await Promise.allSettled([
      fetch("https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=false", { signal: AbortSignal.timeout(6000) }),
      fetch("https://frontend-api.pump.fun/trades/latest?offset=0&limit=200", { signal: AbortSignal.timeout(6000) }),
    ]);

    let coins: PumpCoin[] = [];
    if (coinsRes.status === "fulfilled" && coinsRes.value.ok) {
      coins = await coinsRes.value.json() as PumpCoin[];
    }

    const now = Date.now() / 1000;
    const vol1h = new Map<string, number>();
    if (tradesRes.status === "fulfilled" && tradesRes.value.ok) {
      const trades = await tradesRes.value.json() as PumpTrade[];
      for (const t of trades) {
        if (t.is_buy && t.timestamp && now - t.timestamp < 3600) {
          vol1h.set(t.mint, (vol1h.get(t.mint) ?? 0) + (t.sol_amount ?? 0) * 150);
        }
      }
    }

    const signals: MemeSignal[] = coins
      .filter(c => c.name && c.symbol)
      .map(c => {
        const volume  = vol1h.get(c.mint) ?? 0;
        const replies = c.reply_count ?? 0;
        return {
          address: c.mint, name: c.name, symbol: c.symbol.toUpperCase(),
          score:       scoreMeme(c.name, c.symbol, replies, volume),
          volume1h:    volume > 0 ? volume : null,
          marketCap:   c.usd_market_cap ?? null,
          replyCount:  replies,
          description: c.description?.slice(0, 120) ?? null,
          icon:        c.image_uri ?? null,
          pumpUrl:     `https://pump.fun/${c.mint}`,
          createdAt:   c.created_timestamp ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score || (b.marketCap ?? 0) - (a.marketCap ?? 0))
      .slice(0, 20);

    // Build narrative clusters
    const clusterMap = new Map<string, MemeSignal[]>();
    for (const sig of signals) {
      const nid = matchNarrative(sig.name, sig.symbol);
      if (!nid) continue;
      const arr = clusterMap.get(nid) ?? [];
      arr.push(sig);
      clusterMap.set(nid, arr);
    }

    const narratives: NarrativeStat[] = NARRATIVE_CLUSTERS
      .map(cl => {
        const arr = clusterMap.get(cl.id);
        if (!arr || arr.length === 0) return null;
        const totalVol = arr.reduce((s, c) => s + (c.volume1h ?? 0), 0);
        const momentum = Math.round(arr.reduce((s, c) => s + c.score, 0) / arr.length);
        const top = arr[0];
        return { id: cl.id, label: cl.label, color: cl.color, count: arr.length, totalVol, topSymbol: top.symbol, topIcon: top.icon, momentum };
      })
      .filter((x): x is NarrativeStat => x !== null)
      .sort((a, b) => (b.momentum + b.count * 5) - (a.momentum + a.count * 5));

    return NextResponse.json({ signals, narratives, fetchedAt: Date.now() });
  } catch {
    return NextResponse.json({ signals: [], narratives: [], fetchedAt: Date.now() });
  }
}
