import "server-only";
import { buildGem } from "../scoring";
import type { Gem } from "../types";
import { SCORE_MIN_HELIUS, SKIP_MINTS } from "../env";
import {
  pumpSignatures,
  enrichedTransactions,
  type HeliusTx,
} from "./helius";
import { fetchTokenPair } from "./dexscreener";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface PumpTickResult {
  newGems: Gem[];
  lastSignature: string | null;
}

export async function pumpTick(lastSignature: string | null): Promise<PumpTickResult> {
  const sigs = await pumpSignatures(8);
  if (!sigs.length) return { newGems: [], lastSignature };

  const latest = sigs[0].signature;
  if (latest === lastSignature) return { newGems: [], lastSignature };

  const sliceEnd = lastSignature
    ? Math.max(1, sigs.findIndex(s => s.signature === lastSignature))
    : 4;
  const toFetch = sigs.slice(0, sliceEnd === -1 ? sigs.length : sliceEnd).map(s => s.signature);

  let txs: HeliusTx[] = [];
  try {
    txs = await enrichedTransactions(toFetch.slice(0, 5));
  } catch {
    return { newGems: [], lastSignature: latest };
  }

  const mints = new Set<string>();
  for (const tx of txs) {
    for (const t of tx.tokenTransfers || []) {
      if (t.mint && !SKIP_MINTS.has(t.mint)) mints.add(t.mint);
    }
  }

  const gems: Gem[] = [];
  for (const mint of [...mints].slice(0, 3)) {
    const pair = await fetchTokenPair(mint);
    if (!pair) continue;
    const g = buildGem(mint, pair, "stream");
    if (g && g.score >= SCORE_MIN_HELIUS) gems.push(g);
    await sleep(150);
  }

  return { newGems: gems, lastSignature: latest };
}
