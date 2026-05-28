import type { Gem, KolBuyer, Tier } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DexPair = any;

export function buildGem(
  mint: string,
  pair: DexPair | undefined,
  src: Gem["source"],
  kolBuyers: KolBuyer[] = []
): Gem | null {
  if (!pair?.baseToken) return null;

  const mc = pair.fdv || pair.marketCap || 0;
  const vol = pair.volume?.h24 || 0;
  const vmr = mc > 0 ? vol / mc : 0;
  const age = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 3600000 : null;
  if (age !== null && age > 4) return null; // reject anything older than 4h

  const pc1 = pair.priceChange?.h1 || 0;
  const buys = pair.txns?.h1?.buys || 0;
  const sells = pair.txns?.h1?.sells || 0;
  const bp = parseFloat((sells > 0 ? buys / sells : buys > 0 ? 5 : 1).toFixed(1));

  let sc = src === "helius" ? 60 : src === "stream" ? 65 : 45;
  if (vmr > 10) sc += 22;
  else if (vmr > 5) sc += 16;
  else if (vmr > 2) sc += 9;
  else if (vmr > 0.5) sc += 4;

  if (age !== null) {
    if (age < 0.5) sc += 25;
    else if (age < 1) sc += 20;
    else if (age < 3) sc += 14;
    else if (age < 6) sc += 8;
    else sc += 3;
  }

  if (bp > 3) sc += 14;
  else if (bp > 1.5) sc += 7;

  if (pc1 > 100) sc += 10;
  else if (pc1 > 50) sc += 6;
  else if (pc1 > 20) sc += 3;

  if (kolBuyers.length >= 3) sc += 15;
  else if (kolBuyers.length >= 1) sc += 8;

  sc = Math.min(100, Math.round(sc));

  const xp =
    mc < 20000 ? 1000 :
    mc < 100000 ? 500 :
    mc < 500000 ? 100 :
    mc < 2000000 ? 50 :
    mc < 10000000 ? 10 : 2;

  const tier: Tier =
    sc >= 85 ? "S_TIER" :
    sc >= 70 ? "A_TIER" :
    sc >= 50 ? "B_TIER" :
    sc >= 30 ? "C_TIER" : "RUGGED";

  const reasons: string[] = [];
  if (kolBuyers.length > 0) reasons.push(`${kolBuyers.length} KOL(s) bought early`);
  if (age !== null) reasons.push(age < 1 ? `${(age * 60).toFixed(0)}min old — ultra fresh` : `${Math.round(age)}h old`);
  if (vmr > 2) reasons.push(`Vol/MCap ${vmr.toFixed(1)}x`);
  if (bp > 2) reasons.push(`Buy pressure ${bp}x`);
  if (pc1 > 20) reasons.push(`+${pc1.toFixed(0)}% in 1h`);
  if (mc < 50000) reasons.push("Ultra low cap");

  return {
    id: mint,
    sym: pair.baseToken.symbol || "???",
    name: pair.baseToken.name || "Unknown",
    score: sc,
    tier,
    mcap: mc,
    priceSol: parseFloat(pair.priceNative) || 0,
    vol24h: vol,
    bc: Math.min(100, mc / 690),
    kol: kolBuyers.length,
    kolBuyers,
    holders: 0,
    ageHours: age,
    xPotential: xp,
    priceChange1h: pc1,
    buyPressure: bp,
    contractAddress: mint,
    reasons,
    redFlags: [],
    mintRev: true,
    freezeRev: true,
    source: src,
    dexUrl: pair.url || null,
    detectedAt: new Date().toISOString(),
  };
}
