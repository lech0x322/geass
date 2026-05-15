import "server-only";
import { topHolderInfo } from "./helius";
import { tokenSafety, analyzeSafety } from "./safety";
import type { Gem } from "../types";

/**
 * Enriches a gem in-place with on-chain safety data and top-holder risk.
 * Runs both RPC calls in parallel. Safe to call multiple times.
 */
export async function enrichGem(gem: Gem): Promise<Gem> {
  const [safety, holders] = await Promise.all([
    tokenSafety(gem.contractAddress),
    topHolderInfo(gem.contractAddress),
  ]);

  const analysis = analyzeSafety(safety);
  gem.mintRev = analysis.mintRevoked;
  gem.freezeRev = analysis.freezeRevoked;

  // Reset prior safety-related flags so we don't accumulate duplicates on rescans.
  const safetyFlagPatterns = [/^Mint authority/i, /^Freeze authority/i, /^Could not verify/i];
  gem.redFlags = gem.redFlags.filter((f) => !safetyFlagPatterns.some((p) => p.test(f)));
  for (const f of analysis.flags) gem.redFlags.push(f);

  if (analysis.onBondingCurve && !gem.reasons.some((r) => r.includes("bonding curve"))) {
    gem.reasons.push("On pump.fun bonding curve");
  }

  if (holders) {
    gem.holders = holders.holders;
    gem.redFlags = gem.redFlags.filter((f) => !/^Top holder/i.test(f));
    if (holders.topPct > 30) {
      gem.redFlags.push(`Top holder ${holders.topPct.toFixed(0)}%`);
    }
  }

  return gem;
}

export async function enrichGems(gems: Gem[], maxConcurrent = 4): Promise<Gem[]> {
  const queue = [...gems];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(maxConcurrent, queue.length); i++) {
    workers.push(
      (async () => {
        while (queue.length) {
          const g = queue.shift();
          if (!g) break;
          try {
            await enrichGem(g);
          } catch {
            // swallow per-gem errors; UI shouldn't fail the whole batch
          }
        }
      })(),
    );
  }
  await Promise.all(workers);
  return gems;
}
