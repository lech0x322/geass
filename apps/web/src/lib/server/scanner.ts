import "server-only";
import { buildGem } from "../scoring";
import type { Gem } from "../types";
import { SCAN_LIMIT, SCORE_MIN_HELIUS, SCORE_MIN_DEX, ANTHROPIC_KEY } from "../env";
import {
  pumpSignatures,
  enrichedTransactions,
  extractMintCandidates,
} from "./helius";
import { fetchTokenPair, fetchLatestProfiles, fetchNewPumpTokens } from "./dexscreener";
import { enrichGems } from "./enrich";
import { cached } from "./cache";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Helius: only process pump.fun CREATE transactions ─────────────────────────
// Previously: any token transfer on pump.fun — included old tokens being traded.
// Now: filter to signatures whose logs contain "Instruction: Create" so we only
// see genuinely freshly minted tokens.

export async function scanViaHelius(count: number): Promise<Gem[]> {
  const sigs = await pumpSignatures(60);
  if (!sigs.length) throw new Error("No pump signatures");

  const createMints: string[] = [];
  for (let i = 0; i < sigs.length && createMints.length < SCAN_LIMIT * 2; i += 15) {
    const batch = sigs.slice(i, i + 15).map(s => s.signature);
    const txs = await enrichedTransactions(batch);
    for (const tx of txs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logs: string[] = (tx as any).logs ?? [];
      const isCreate = logs.some(l => /Instruction:\s*Create\b/i.test(l));
      if (!isCreate) continue;
      for (const t of tx.tokenTransfers ?? []) {
        if (t.mint && !createMints.includes(t.mint)) createMints.push(t.mint);
      }
    }
  }

  // Supplement with pump.fun API sorted by creation_time
  try {
    const pumpNew = await fetchNewPumpTokens();
    for (const t of pumpNew.slice(0, 20)) {
      if (!createMints.includes(t.mint)) createMints.push(t.mint);
    }
  } catch { /* optional supplement */ }

  if (!createMints.length) throw new Error("No new mints found");

  const gems: Gem[] = [];
  for (const mint of createMints.slice(0, SCAN_LIMIT)) {
    if (gems.length >= count) break;
    const pair = await fetchTokenPair(mint);
    if (pair) {
      const g = buildGem(mint, pair, "helius");
      if (g && g.score >= SCORE_MIN_HELIUS) gems.push(g);
    }
    await sleep(180);
  }

  await enrichGems(gems.slice(0, 5), 4);
  return gems.sort((a, b) => b.score - a.score);
}

// ── Pump.fun new token feed (primary) + DexScreener profiles (fallback) ───────
// fetchLatestProfiles returns tokens that updated logo/socials — could be old.
// fetchNewPumpTokens returns tokens sorted by creation_time — genuinely new.

export async function scanViaDexScreener(count: number): Promise<Gem[]> {
  let mints: string[] = [];
  const pumpNew = await fetchNewPumpTokens();
  if (pumpNew.length) {
    mints = pumpNew.slice(0, SCAN_LIMIT * 2).map(t => t.mint);
  } else {
    const profiles = await fetchLatestProfiles();
    if (!profiles.length) throw new Error("No token sources available");
    mints = profiles.slice(0, SCAN_LIMIT).map(p => p.tokenAddress);
  }

  const gems: Gem[] = [];
  for (const mint of mints) {
    if (gems.length >= count) break;
    const pair = await fetchTokenPair(mint);
    if (pair) {
      const g = buildGem(mint, pair, "dex");
      if (g && g.score >= SCORE_MIN_DEX) gems.push(g);
    }
    await sleep(100);
  }
  await enrichGems(gems.slice(0, 5), 4);
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

async function runScanUncached(count: number): Promise<{ gems: Gem[]; source: string; error?: string }> {
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

/**
 * Cached scan. TTL is short (5s) so the live view stays fresh while
 * coalescing the thundering herd: 100 simultaneous clicks = 1 upstream call.
 */
export function runScan(count = 6) {
  return cached(`scan:${count}`, 5_000, () => runScanUncached(count));
}
