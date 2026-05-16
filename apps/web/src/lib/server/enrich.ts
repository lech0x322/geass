import "server-only";
import { topHolderInfo } from "./helius";
import { tokenSafety, analyzeSafety } from "./safety";
import { fetchBondingCurve } from "./bondingCurve";
import { fetchRecentKolBuyers } from "./kol";
import type { Gem } from "../types";
import type { KolBuyer } from "../types";

export async function enrichGem(gem: Gem): Promise<Gem> {
  const [safety, holders, bc, kolBuyers] = await Promise.all([
    tokenSafety(gem.contractAddress),
    topHolderInfo(gem.contractAddress),
    fetchBondingCurve(gem.contractAddress),
    fetchRecentKolBuyers(gem.contractAddress),
  ]);

  const analysis = analyzeSafety(safety);
  gem.mintRev = analysis.mintRevoked;
  gem.freezeRev = analysis.freezeRevoked;

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

  // Merge KOL buyers (don't overwrite those detected inline from tx)
  if (kolBuyers.length) {
    const existing = new Set((gem.kolBuyers || []).map((k: KolBuyer) => k.l || k.label));
    const fresh = kolBuyers.filter((k) => !existing.has(k.l || k.label));
    gem.kolBuyers = [...(gem.kolBuyers || []), ...fresh];
    gem.kol = gem.kolBuyers.length;
    if (gem.kol > 0 && !gem.reasons.some((r) => r.includes("KOL"))) {
      gem.reasons.push(`KOL buy: ${gem.kolBuyers.slice(0, 2).map((k) => k.l || k.label).join(", ")}`);
    }
  }

  if (bc) {
    gem.bondingCurve = {
      progress: bc.progress,
      solCollected: bc.solCollected,
      complete: bc.complete,
    };
    gem.bc = bc.progress;
    gem.reasons = gem.reasons.filter((r) => !r.includes("bonding curve") && !r.includes("Graduated"));
    if (bc.complete) {
      gem.reasons.push("Graduated to Raydium");
    } else if (bc.progress >= 70) {
      gem.reasons.push(`Curve ${bc.progress.toFixed(0)}% — close to grad`);
    } else if (bc.progress > 0) {
      gem.reasons.push(`Curve ${bc.progress.toFixed(0)}% · ${bc.solCollected.toFixed(1)} SOL in`);
    }
  } else {
    gem.bondingCurve = null;
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
          try { await enrichGem(g); } catch {/* swallow per-gem errors */}
        }
      })(),
    );
  }
  await Promise.all(workers);
  return gems;
}
