import { HELIUS_RPC, HELIUS_API, HELIUS_KEY, PUMP_PROG, SKIP } from "./config";
import { wait } from "./utils";

export interface Gem {
  id: string; sym: string; name: string; score: number; tier: string;
  mcap: number; priceSol: number; vol24h: number; bc: number;
  kol: number; kolBuyers: { l?: string; label?: string; s?: number; solAmount?: number }[];
  holders: number; ageHours: number | null; xPotential: number;
  priceChange1h: number; buyPressure: number; contractAddress: string;
  reasons: string[]; redFlags: string[]; mintRev: boolean; freezeRev: boolean;
  source: string; dexUrl: string | null; detectedAt: string;
}

export async function hRpc(method: string, params: unknown[]) {
  const r = await fetch(HELIUS_RPC, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("H" + r.status);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildGem(mint: string, pair: any, src: string, kolBuyers: Gem["kolBuyers"] = []): Gem | null {
  if (!pair?.baseToken) return null;
  const mc = pair.fdv || pair.marketCap || 0;
  const vol = pair.volume?.h24 || 0;
  const vmr = mc > 0 ? vol / mc : 0;
  const age = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 3600000 : null;
  if (age !== null && age > 12) return null;
  const pc1 = pair.priceChange?.h1 || 0;
  const buys = pair.txns?.h1?.buys || 0;
  const sells = pair.txns?.h1?.sells || 0;
  const bp = parseFloat((sells > 0 ? buys / sells : buys > 0 ? 5 : 1).toFixed(1));

  let sc = src === "helius" ? 60 : 45;
  if (vmr > 10) sc += 22; else if (vmr > 5) sc += 16; else if (vmr > 2) sc += 9; else if (vmr > 0.5) sc += 4;
  if (age !== null) {
    if (age < 0.5) sc += 25; else if (age < 1) sc += 20; else if (age < 3) sc += 14; else if (age < 6) sc += 8; else sc += 3;
  }
  if (bp > 3) sc += 14; else if (bp > 1.5) sc += 7;
  if (pc1 > 100) sc += 10; else if (pc1 > 50) sc += 6; else if (pc1 > 20) sc += 3;
  if (kolBuyers.length >= 3) sc += 15; else if (kolBuyers.length >= 1) sc += 8;
  sc = Math.min(100, Math.round(sc));

  const xp = mc < 20000 ? 1000 : mc < 100000 ? 500 : mc < 500000 ? 100 : mc < 2000000 ? 50 : mc < 10000000 ? 10 : 2;
  const tier = sc >= 85 ? "S_TIER" : sc >= 70 ? "A_TIER" : sc >= 50 ? "B_TIER" : sc >= 30 ? "C_TIER" : "RUGGED";
  const reasons: string[] = [];
  if (kolBuyers.length > 0) reasons.push(`${kolBuyers.length} KOL(s) bought early`);
  if (age !== null) reasons.push(age < 1 ? `${(age * 60).toFixed(0)}min old — ultra fresh` : `${Math.round(age)}h old`);
  if (vmr > 2) reasons.push(`Vol/MCap ${vmr.toFixed(1)}x`);
  if (bp > 2) reasons.push(`Buy pressure ${bp}x`);
  if (pc1 > 20) reasons.push(`+${pc1.toFixed(0)}% in 1h`);
  if (mc < 50000) reasons.push("Ultra low cap");

  return {
    id: mint, sym: pair.baseToken.symbol || "???", name: pair.baseToken.name || "Unknown",
    score: sc, tier, mcap: mc, priceSol: pair.priceNative || 0, vol24h: vol,
    bc: Math.min(100, mc / 690), kol: kolBuyers.length, kolBuyers, holders: 0, ageHours: age,
    xPotential: xp, priceChange1h: pc1, buyPressure: bp, contractAddress: mint,
    reasons, redFlags: [], mintRev: true, freezeRev: true, source: src,
    dexUrl: pair.url || null, detectedAt: new Date().toISOString(),
  };
}

export async function scanHelius(count: number): Promise<Gem[]> {
  const sigs = await hRpc("getSignaturesForAddress", [PUMP_PROG, { limit: 30 }]);
  const sl = sigs.slice(0, 15).map((s: { signature: string }) => s.signature);
  const tr = await fetch(`${HELIUS_API}/transactions?api-key=${HELIUS_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: sl }), signal: AbortSignal.timeout(12000),
  });
  if (!tr.ok) throw new Error("TX " + tr.status);
  const txs = await tr.json();
  const mc = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Array.isArray(txs) ? txs : []).forEach((tx: any) => (tx.tokenTransfers || []).forEach((t: any) => {
    if (t.mint && !SKIP.has(t.mint)) mc.set(t.mint, (mc.get(t.mint) || 0) + 1);
  }));
  const mints = [...mc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([m]) => m);
  if (!mints.length) throw new Error("No mints");
  const gems: Gem[] = [];
  for (const mint of mints) {
    if (gems.length >= count) break;
    try {
      const d = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) }).then(r => r.json());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pair = (d.pairs || []).sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))[0];
      const g = buildGem(mint, pair, "helius");
      if (g && g.score >= 50) gems.push(g);
    } catch {}
    await wait(200);
  }
  for (let i = 0; i < Math.min(gems.length, 3); i++) {
    try {
      const h = await hRpc("getTokenLargestAccounts", [gems[i].contractAddress]);
      const accs = h?.value || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tot = accs.reduce((s: number, a: any) => s + parseFloat(a.uiAmount || 0), 0);
      if (tot > 0) {
        const t1 = parseFloat(accs[0]?.uiAmount || 0) / tot * 100;
        if (t1 > 30) gems[i].redFlags.push("Top holder " + t1.toFixed(0) + "%");
        gems[i].holders = accs.length;
      }
    } catch {}
    await wait(300);
  }
  return gems.sort((a, b) => b.score - a.score);
}

export async function scanDexScreener(count: number): Promise<Gem[]> {
  const r = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("DX");
  const raw = await r.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arr: any[] = Array.isArray(raw) ? raw : (raw.data || []);
  const sol = arr.filter(p => p.chainId === "solana").slice(0, 15);
  const gems: Gem[] = [];
  for (const p of sol) {
    if (gems.length >= count) break;
    try {
      const d = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${p.tokenAddress}`, { signal: AbortSignal.timeout(5000) }).then(r2 => r2.json());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pair = (d.pairs || []).sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))[0];
      const g = buildGem(p.tokenAddress, pair, "dex");
      if (g && g.score >= 45) gems.push(g);
    } catch {}
    await wait(100);
  }
  return gems.sort((a, b) => b.score - a.score);
}

export async function scanAI(count: number): Promise<Gem[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 3000,
      system: `Generate ${count} realistic Solana memecoins <6h old. ONLY raw JSON array.`,
      messages: [{ role: "user", content: "Pre-pump scan. JSON only." }],
    }),
  });
  if (!res.ok) throw new Error("AI " + res.status);
  const d = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txt = d.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const si = txt.indexOf("["), ei = txt.lastIndexOf("]");
  if (si === -1) throw new Error("Parse");
  return JSON.parse(txt.slice(si, ei + 1));
}
