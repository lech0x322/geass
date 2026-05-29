import "server-only";
import { buildGem } from "../scoring";
import type { Gem } from "../types";
import { SCAN_LIMIT, SCORE_MIN_HELIUS, SCORE_MIN_DEX } from "../env";
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
  return { gems: [], source: "NONE", error: "All scan sources failed" };
}

/**
 * Cached scan. TTL is short (5s) so the live view stays fresh while
 * coalescing the thundering herd: 100 simultaneous clicks = 1 upstream call.
 */
export function runScan(count = 6) {
  return cached(`scan:${count}`, 5_000, () => runScanUncached(count));
}
