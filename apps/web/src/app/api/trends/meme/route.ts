import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keywords that carry meme-launch potential
const MEME_KEYWORDS = [
  "dog","doge","shib","pepe","cat","frog","ape","moon","elon","musk","trump","grok",
  "wojak","chad","based","meme","pump","gigachad","bonk","wif","popcat","pnut","ponke",
  "harambe","goat","zeus","baby","sir","cope","shill","npc","ai","gm","wen","lambo",
  "rug","sus","ngmi","wagmi","fud","bear","bull","crab","dog","monkey","snake","pig",
];

function scoreMeme(name: string, symbol: string, replyCount: number, volume: number): number {
  const combined = `${name} ${symbol}`.toLowerCase();
  let score = 0;

  for (const kw of MEME_KEYWORDS) {
    if (combined.includes(kw)) { score += 15; break; }
  }

  if (symbol.length <= 4) score += 10;

  if (replyCount > 100) score += 20;
  else if (replyCount > 30) score += 10;

  if (volume > 50_000)     score += 30;
  else if (volume > 5_000) score += 15;
  else if (volume > 500)   score += 5;

  return Math.min(100, score);
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

type PumpCoin = {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  usd_market_cap?: number;
  reply_count?: number;
  created_timestamp?: number;
};

type PumpTrade = {
  mint: string;
  sol_amount?: number;
  is_buy?: boolean;
  timestamp?: number;
};

export async function GET() {
  try {
    const [coinsRes, tradesRes] = await Promise.allSettled([
      fetch(
        "https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=false",
        { signal: AbortSignal.timeout(6000) },
      ),
      fetch(
        "https://frontend-api.pump.fun/trades/latest?offset=0&limit=200",
        { signal: AbortSignal.timeout(6000) },
      ),
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
          // approximate USD volume at ~$150/SOL
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
          address:     c.mint,
          name:        c.name,
          symbol:      c.symbol.toUpperCase(),
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

    return NextResponse.json({ signals, fetchedAt: Date.now() });
  } catch {
    return NextResponse.json({ signals: [], fetchedAt: Date.now() });
  }
}
