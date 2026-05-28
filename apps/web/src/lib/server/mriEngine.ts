import "server-only";
import { fetchTokenPair } from "./dexscreener";
import { topHolderInfo } from "./helius";
import { firecrawlSearch, firecrawlEnabled } from "./firecrawl";
import { KOL_WALLETS } from "./kol";
import { cached } from "./cache";

export interface MriScore {
  mint:         string;
  sym:          string;
  name:         string;
  total:        number;
  tier:         "ALERT" | "S" | "A" | "B" | "IGNORE";
  components: {
    onChain:   number;
    social:    number;
    kol:       number;
    liquidity: number;
    momentum:  number;
    freshness: number;
  };
  signals: string[];
  computedAt: number;
}

async function computeMriUncached(mint: string): Promise<MriScore | null> {
  const pair = await fetchTokenPair(mint);
  if (!pair) return null;

  const sym  = pair.baseToken?.symbol ?? "?";
  const name = pair.baseToken?.name   ?? "Unknown";

  // ── onChain (0–20) ────────────────────────────────────────────────────────
  let onChain = 0;
  const buys  = pair.txns?.h1?.buys  ?? 0;
  const sells = pair.txns?.h1?.sells ?? 0;
  const total1h = buys + sells;
  const buyRatio = total1h > 0 ? buys / total1h : 0;
  if      (buyRatio >= 0.7) onChain += 20;
  else if (buyRatio >= 0.6) onChain += 15;
  else if (buyRatio >= 0.5) onChain += 10;
  else                       onChain += 5;

  const volH1 = pair.volume?.h1 ?? 0;
  const volH6 = pair.volume?.h6 ?? 0;
  if (volH6 > 0) {
    const accel = volH1 / volH6;
    if      (accel > 1.5) onChain += 3;
    else if (accel > 1.2) onChain += 1;
  }
  onChain = Math.min(onChain, 20);

  // ── social (0–20) ─────────────────────────────────────────────────────────
  let social = 0;
  if (firecrawlEnabled()) {
    const results = await Promise.race([
      firecrawlSearch("$" + sym + " solana memecoin", { limit: 5 }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12_000)),
    ]).catch(() => [] as Awaited<ReturnType<typeof firecrawlSearch>>);
    const mentions = results.length;
    if      (mentions >= 5) social = 18;
    else if (mentions >= 3) social = 13;
    else if (mentions >= 1) social = 8;
    else                    social = 3;
  } else {
    const pc1h = pair.priceChange?.h1 ?? 0;
    if      (pc1h > 100) social = 16;
    else if (pc1h > 50)  social = 12;
    else if (pc1h > 20)  social = 8;
    else                 social = 4;
  }
  social = Math.min(social, 20);

  // ── kol (0–20) ────────────────────────────────────────────────────────────
  let kol = 0;
  // pair.info?.socials or other buyer data lives in kolBuyers-style arrays
  // We resolve KOL tiers by cross-referencing pair-level buyer labels against KOL_WALLETS
  const kolBuyerLabels: string[] = pair.kolBuyers ?? [];
  const matchedTiers: number[] = [];
  for (const [, entry] of KOL_WALLETS) {
    if (kolBuyerLabels.includes(entry.label)) {
      matchedTiers.push(entry.tier);
    }
  }

  if (matchedTiers.length === 0) {
    kol = 2;
  } else {
    const bestTier = Math.min(...matchedTiers);
    const baseScore = bestTier === 1 ? 20 : bestTier === 2 ? 14 : 9;
    const extras = (matchedTiers.length - 1) * 2;
    kol = Math.min(baseScore + extras, 20);
  }

  // ── liquidity (0–20) ──────────────────────────────────────────────────────
  let liquidity = 0;
  const liq = pair.liquidity?.usd ?? 0;
  const mc  = pair.fdv || pair.marketCap || 0;
  const ratio = mc > 0 ? liq / mc : 0;
  if      (ratio > 0.15) liquidity = 18;
  else if (ratio > 0.08) liquidity = 13;
  else if (ratio > 0.03) liquidity = 8;
  else                   liquidity = 3;

  const holderInfo = await topHolderInfo(mint);
  if (holderInfo) {
    if      (holderInfo.topPct > 40) liquidity -= 6;
    else if (holderInfo.topPct > 25) liquidity -= 3;
  }

  // mint revoked bonus
  const mintRevoked = pair.info?.mintRevoked ?? false;
  if (mintRevoked) liquidity += 2;

  liquidity = Math.max(0, Math.min(liquidity, 20));

  // ── momentum (0–10) ───────────────────────────────────────────────────────
  let momentum = 0;
  const h1 = pair.priceChange?.h1 ?? 0;
  const h6 = pair.priceChange?.h6 ?? 0;
  if (h1 > 0 && h6 > 0 && h1 < h6 * 0.5) {
    momentum = 8; // consolidation after pump
  } else if (h1 > 50) {
    momentum = 6;
  } else if (h1 > 20) {
    momentum = 4;
  } else if (h1 > 0) {
    momentum = 2;
  } else {
    momentum = 1;
  }

  // ── freshness (0–10) ──────────────────────────────────────────────────────
  let freshness = 0;
  const ageMin = pair.pairCreatedAt
    ? (Date.now() - pair.pairCreatedAt) / 60_000
    : null;
  if (ageMin === null)       freshness = 5;
  else if (ageMin < 15)     freshness = 10;
  else if (ageMin < 60)     freshness = 8;
  else if (ageMin < 4 * 60) freshness = 5;
  else if (ageMin < 12 * 60)freshness = 2;
  else                       freshness = 0;

  // ── total & tier ─────────────────────────────────────────────────────────
  const total = onChain + social + kol + liquidity + momentum + freshness;

  let tier: MriScore["tier"];
  if      (total >= 85) tier = "ALERT";
  else if (total >= 70) tier = "S";
  else if (total >= 55) tier = "A";
  else if (total >= 40) tier = "B";
  else                  tier = "IGNORE";

  // ── signals ───────────────────────────────────────────────────────────────
  const signals: string[] = [];
  if (onChain   >= 14) signals.push(`Strong buy pressure (${buyRatio > 0 ? Math.round(buyRatio * 100) : "?"}% buys in 1h)`);
  if (social    >= 14) signals.push("High social mentions detected");
  if (kol       >= 14) signals.push("KOL wallet activity confirmed");
  if (liquidity >= 14) signals.push(`Healthy liquidity ratio (${mc > 0 ? (ratio * 100).toFixed(1) : "?"}%)`);
  if (momentum  >= 7)  signals.push("Momentum consolidating — possible accumulation");
  if (freshness >= 7)  signals.push(`Very fresh token (${ageMin !== null ? `${Math.round(ageMin)}m old` : "age unknown"})`);

  return {
    mint,
    sym,
    name,
    total,
    tier,
    components: { onChain, social, kol, liquidity, momentum, freshness },
    signals,
    computedAt: Date.now(),
  };
}

export function computeMri(mint: string): Promise<MriScore | null> {
  return cached(`mri:${mint}`, 30_000, () => computeMriUncached(mint));
}
