import "server-only";
import { buildGem } from "../scoring";
import type { Gem } from "../types";
import { SCAN_LIMIT, SCORE_MIN_HELIUS, SCORE_MIN_DEX, ANTHROPIC_KEY } from "../env";
import {
  pumpSignatures,
  enrichedTransactions,
  extractMintCandidates,
  topHolderInfo,
} from "./helius";
import { fetchTokenPair, fetchLatestProfiles } from "./dexscreener";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function scanViaHelius(count: number): Promise<Gem[]> {
  const sigs = await pumpSignatures(30);
  if (!sigs.length) throw new Error("No pump signatures");
  const txs = await enrichedTransactions(sigs.slice(0, 15).map(s => s.signature));
  const counts = extractMintCandidates(txs);
  const mints = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SCAN_LIMIT)
    .map(([m]) => m);

  if (!mints.length) throw new Error("No mints found");

  const gems: Gem[] = [];
  for (const mint of mints) {
    if (gems.length >= count) break;
    const pair = await fetchTokenPair(mint);
    if (pair) {
      const g = buildGem(mint, pair, "helius");
      if (g && g.score >= SCORE_MIN_HELIUS) gems.push(g);
    }
    await sleep(180);
  }

  // Enrich top 3 with holder risk
  for (let i = 0; i < Math.min(gems.length, 3); i++) {
    const info = await topHolderInfo(gems[i].contractAddress);
    if (info) {
      gems[i].holders = info.holders;
      if (info.topPct > 30) gems[i].redFlags.push(`Top holder ${info.topPct.toFixed(0)}%`);
    }
    await sleep(250);
  }

  return gems.sort((a, b) => b.score - a.score);
}

export async function scanViaDexScreener(count: number): Promise<Gem[]> {
  const profiles = await fetchLatestProfiles();
  if (!profiles.length) throw new Error("No DexScreener profiles");
  const gems: Gem[] = [];
  for (const p of profiles.slice(0, SCAN_LIMIT)) {
    if (gems.length >= count) break;
    const pair = await fetchTokenPair(p.tokenAddress);
    if (pair) {
      const g = buildGem(p.tokenAddress, pair, "dex");
      if (g && g.score >= SCORE_MIN_DEX) gems.push(g);
    }
    await sleep(100);
  }
  return gems.sort((a, b) => b.score - a.score);
}

export async function scanViaAI(count: number): Promise<Gem[]> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY missing");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      system: `Generate ${count} realistic Solana memecoin candidates (<6h old). Output ONLY a raw JSON array, no prose. Each item must match the Gem schema with fields: id, sym, name, score, tier, mcap, priceSol, vol24h, bc, kol, kolBuyers, holders, ageHours, xPotential, priceChange1h, buyPressure, contractAddress, reasons, redFlags, mintRev, freezeRev, source, dexUrl, detectedAt.`,
      messages: [{ role: "user", content: "Pre-pump scan. JSON only." }],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const d = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txt: string = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const si = txt.indexOf("["), ei = txt.lastIndexOf("]");
  if (si === -1 || ei === -1) throw new Error("AI parse fail");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any[] = JSON.parse(txt.slice(si, ei + 1));
  const now = new Date().toISOString();
  return parsed.map(p => ({ ...p, source: "ai" as const, detectedAt: p.detectedAt || now }));
}

export async function runScan(count = 6): Promise<{ gems: Gem[]; source: string; error?: string }> {
  try {
    const gems = await scanViaHelius(count);
    return { gems, source: "HELIUS" };
  } catch (e) {
    console.warn("[scan] helius failed:", e instanceof Error ? e.message : e);
  }
  try {
    const gems = await scanViaDexScreener(count);
    return { gems, source: "DEXSCREENER" };
  } catch (e) {
    console.warn("[scan] dex failed:", e instanceof Error ? e.message : e);
  }
  if (ANTHROPIC_KEY) {
    try {
      const gems = await scanViaAI(count);
      return { gems, source: "AI" };
    } catch (e) {
      console.warn("[scan] ai failed:", e instanceof Error ? e.message : e);
    }
  }
  return { gems: [], source: "NONE", error: "All scan sources failed" };
}
