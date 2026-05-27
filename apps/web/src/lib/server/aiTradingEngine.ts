import "server-only";
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import Anthropic from "@anthropic-ai/sdk";
import { redis } from "./redis";
import { ANTHROPIC_KEY, SOLANA_RPC, GEASS_WALLET_PRIVKEY } from "../env";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TradingSignal {
  id:         string;
  source:     "kol_buy" | "volume_surge" | "meme_scan" | "x_mention" | "ai_scan";
  mint:       string;
  symbol:     string;
  name:       string;
  confidence: number; // 0-100
  direction:  "buy" | "sell";
  urgency:    "low" | "medium" | "high";
  reasons:    string[];
  metadata: {
    score?:        number;
    mcap?:         number;
    vol24h?:       number;
    ageHours?:     number | null;
    kolName?:      string;
    priceChangePct?: number;
  };
  timestamp: number;
}

export interface TradeDecision {
  action:         "buy" | "sell" | "skip";
  amountSol:      number;
  reason:         string;
  confidence:     number;
  stopLossPct:    number;
  takeProfitPct:  number;
}

export interface Position {
  id:            string;
  wallet:        string;
  mint:          string;
  symbol:        string;
  amountSol:     number;
  tokenAmount:   number;
  entryPriceSol: number;
  stopLossPct:   number;
  takeProfitPct: number;
  openedAt:      number;
  closedAt?:     number;
  status:        "open" | "closed" | "failed";
  closedReason?: "stop_loss" | "take_profit" | "manual" | "emergency";
  exitPriceSol?: number;
  pnlSol?:       number;
  pnlPct?:       number;
  signature?:    string;
  exitSignature?: string;
  isPaper:       boolean;
  aiReason:      string;
  confidence:    number;
  signal:        TradingSignal;
}

export interface TradingStats {
  totalTrades:   number;
  winCount:      number;
  lossCount:     number;
  totalPnlSol:   number;
  winRate:       number;
  avgPnlPct:     number;
  dailyLossSol:  number;
  lastResetDate: string; // YYYY-MM-DD
}

export interface RiskConfig {
  maxPositionSol:   number;
  maxOpenPositions: number;
  maxDailyLossSol:  number;
  minLiquidityUsd:  number;
  maxAgeHours:      number;
  minScore:         number;
  stopLossPct:      number;
  takeProfitPct:    number;
  minConfidence:    number;
}

export const DEFAULT_RISK: RiskConfig = {
  maxPositionSol:   0.3,
  maxOpenPositions: 5,
  maxDailyLossSol:  1.0,
  minLiquidityUsd:  5_000,
  maxAgeHours:      4,
  minScore:         55,
  stopLossPct:      20,
  takeProfitPct:    60,
  minConfidence:    60,
};

// ── Redis keys ────────────────────────────────────────────────────────────────

function posKey(wallet: string) { return `geass:at:positions:${wallet}`; }
function statsKey(wallet: string) { return `geass:at:stats:${wallet}`; }

// ── In-memory fallback ────────────────────────────────────────────────────────

const memPositions = new Map<string, Position[]>();
const memStats     = new Map<string, TradingStats>();

// ── Price fetching via Jupiter ────────────────────────────────────────────────

export async function getTokenPriceSol(mint: string): Promise<number | null> {
  try {
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const r = await fetch(
      `https://api.jup.ag/price/v2?ids=${mint},${SOL_MINT}`,
      { signal: AbortSignal.timeout(5_000), cache: "no-store" },
    );
    if (!r.ok) return null;
    const d = await r.json() as { data: Record<string, { price: number } | null> };
    const tokenUsd = d.data[mint]?.price;
    const solUsd   = d.data[SOL_MINT]?.price;
    if (!tokenUsd || !solUsd) return null;
    return tokenUsd / solUsd; // price in SOL
  } catch { return null; }
}

// ── Position store ─────────────────────────────────────────────────────────────

export async function getPositions(wallet: string): Promise<Position[]> {
  try {
    const raw = await redis.get<Position[]>(posKey(wallet));
    if (raw) return raw;
  } catch {}
  return memPositions.get(wallet) ?? [];
}

async function savePositions(wallet: string, positions: Position[]): Promise<void> {
  memPositions.set(wallet, positions);
  try { await redis.set(posKey(wallet), positions, 86_400 * 7); } catch {}
}

export async function getStats(wallet: string): Promise<TradingStats> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = await redis.get<TradingStats>(statsKey(wallet));
    if (raw) {
      if (raw.lastResetDate !== today) { raw.dailyLossSol = 0; raw.lastResetDate = today; }
      return raw;
    }
  } catch {}
  return memStats.get(wallet) ?? {
    totalTrades: 0, winCount: 0, lossCount: 0, totalPnlSol: 0,
    winRate: 0, avgPnlPct: 0, dailyLossSol: 0, lastResetDate: today,
  };
}

async function saveStats(wallet: string, stats: TradingStats): Promise<void> {
  memStats.set(wallet, stats);
  try { await redis.set(statsKey(wallet), stats, 86_400 * 30); } catch {}
}

// ── Risk check ────────────────────────────────────────────────────────────────

export async function passesRiskCheck(
  wallet: string, signal: TradingSignal, decision: TradeDecision, risk: RiskConfig,
): Promise<{ ok: boolean; reason: string }> {
  if (decision.action !== "buy") return { ok: true, reason: "" };

  // Confidence gate
  if (signal.confidence < risk.minConfidence)
    return { ok: false, reason: `Confidence ${signal.confidence} < min ${risk.minConfidence}` };

  // Score gate
  if ((signal.metadata.score ?? 0) < risk.minScore && signal.source !== "kol_buy")
    return { ok: false, reason: `Score ${signal.metadata.score ?? 0} < min ${risk.minScore}` };

  // Age gate
  if (signal.metadata.ageHours != null && signal.metadata.ageHours > risk.maxAgeHours)
    return { ok: false, reason: `Token age ${signal.metadata.ageHours}h > max ${risk.maxAgeHours}h` };

  // Daily loss gate
  const stats = await getStats(wallet);
  if (stats.dailyLossSol >= risk.maxDailyLossSol)
    return { ok: false, reason: `Daily loss limit reached (${stats.dailyLossSol.toFixed(3)} SOL)` };

  // Open positions gate
  const positions = await getPositions(wallet);
  const openCount = positions.filter(p => p.status === "open").length;
  if (openCount >= risk.maxOpenPositions)
    return { ok: false, reason: `Max open positions (${risk.maxOpenPositions}) reached` };

  // Position size gate
  if (decision.amountSol > risk.maxPositionSol)
    decision.amountSol = risk.maxPositionSol; // clamp, don't reject

  return { ok: true, reason: "" };
}

// ── AI Decision Engine ────────────────────────────────────────────────────────

export async function aiAnalyzeSignal(
  signal: TradingSignal,
  portfolioSol: number,
  risk: RiskConfig,
  existingPositions: number,
): Promise<TradeDecision> {
  if (!ANTHROPIC_KEY) {
    // Fallback heuristic when no API key
    const confidence = signal.confidence;
    if (confidence >= 70 && existingPositions < risk.maxOpenPositions) {
      return {
        action: "buy",
        amountSol: Math.min(risk.maxPositionSol, portfolioSol * 0.1),
        reason: `Heuristic: signal confidence ${confidence} ≥ 70`,
        confidence,
        stopLossPct: risk.stopLossPct,
        takeProfitPct: risk.takeProfitPct,
      };
    }
    return { action: "skip", amountSol: 0, reason: "Confidence too low", confidence, stopLossPct: 0, takeProfitPct: 0 };
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  const prompt = `You are a Solana memecoin trading AI assistant.
Analyze this trading signal and decide whether to BUY, SELL, or SKIP.
Be CONSERVATIVE — protect capital first.

Signal:
- Source: ${signal.source}
- Token: ${signal.symbol} (${signal.name})
- Confidence: ${signal.confidence}/100
- Urgency: ${signal.urgency}
- Reasons: ${signal.reasons.join("; ")}
- Score: ${signal.metadata.score ?? "N/A"}
- Market Cap: $${signal.metadata.mcap ? (signal.metadata.mcap / 1000).toFixed(0) + "K" : "N/A"}
- Volume 24h: $${signal.metadata.vol24h ? (signal.metadata.vol24h / 1000).toFixed(0) + "K" : "N/A"}
- Age: ${signal.metadata.ageHours != null ? signal.metadata.ageHours.toFixed(1) + "h" : "N/A"}
- Price change: ${signal.metadata.priceChangePct != null ? signal.metadata.priceChangePct.toFixed(1) + "%" : "N/A"}

Portfolio: ${portfolioSol.toFixed(3)} SOL
Open positions: ${existingPositions}/${risk.maxOpenPositions}
Max position size: ${risk.maxPositionSol} SOL
Stop loss: ${risk.stopLossPct}% | Take profit: ${risk.takeProfitPct}%

Respond ONLY with valid JSON, no markdown:
{
  "action": "buy" | "sell" | "skip",
  "amount_sol": <number between 0.01 and ${risk.maxPositionSol}>,
  "reason": "<one sentence explanation>",
  "confidence": <0-100>,
  "stop_loss_pct": <number>,
  "take_profit_pct": <number>
}`;

  try {
    const msg = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    const json = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as {
      action: "buy" | "sell" | "skip";
      amount_sol: number;
      reason: string;
      confidence: number;
      stop_loss_pct: number;
      take_profit_pct: number;
    };

    return {
      action:        json.action        ?? "skip",
      amountSol:     Math.min(json.amount_sol ?? 0.05, risk.maxPositionSol),
      reason:        json.reason        ?? "AI decision",
      confidence:    json.confidence    ?? signal.confidence,
      stopLossPct:   json.stop_loss_pct   ?? risk.stopLossPct,
      takeProfitPct: json.take_profit_pct ?? risk.takeProfitPct,
    };
  } catch (e) {
    return {
      action: "skip", amountSol: 0,
      reason: `AI error: ${e instanceof Error ? e.message : String(e)}`,
      confidence: 0, stopLossPct: 0, takeProfitPct: 0,
    };
  }
}

// ── Open position ─────────────────────────────────────────────────────────────

export async function openPosition(params: {
  wallet:    string;
  signal:    TradingSignal;
  decision:  TradeDecision;
  isPaper:   boolean;
}): Promise<{ position: Position; signature?: string; error?: string }> {
  const { wallet, signal, decision, isPaper } = params;

  const entryPriceSol = await getTokenPriceSol(signal.mint) ?? 0;
  const tokenAmount   = entryPriceSol > 0 ? decision.amountSol / entryPriceSol : 0;

  const position: Position = {
    id:            `${Date.now()}-${signal.mint.slice(0, 8)}`,
    wallet,
    mint:          signal.mint,
    symbol:        signal.symbol,
    amountSol:     decision.amountSol,
    tokenAmount,
    entryPriceSol,
    stopLossPct:   decision.stopLossPct,
    takeProfitPct: decision.takeProfitPct,
    openedAt:      Date.now(),
    status:        "open",
    isPaper,
    aiReason:      decision.reason,
    confidence:    decision.confidence,
    signal,
  };

  let signature: string | undefined;

  if (!isPaper) {
    // Live execution via Jupiter + Jito
    try {
      if (!GEASS_WALLET_PRIVKEY) throw new Error("GEASS_WALLET_PRIVKEY not set");
      const keypair = Keypair.fromSecretKey(bs58.decode(GEASS_WALLET_PRIVKEY.replace(/[^1-9A-HJ-NP-Za-km-z]/g, "")));
      const conn    = new Connection(SOLANA_RPC, "confirmed");

      // Get Jupiter quote
      const SOL_MINT = "So11111111111111111111111111111111111111112";
      const amountLamports = Math.floor(decision.amountSol * 1e9);
      const quoteR = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${signal.mint}&amount=${amountLamports}&slippageBps=150`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!quoteR.ok) throw new Error(`Jupiter quote failed: ${quoteR.status}`);
      const quote = await quoteR.json();

      // Get swap transaction
      const swapR = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse:            quote,
          userPublicKey:            keypair.publicKey.toBase58(),
          wrapAndUnwrapSol:         true,
          dynamicComputeUnitLimit:  true,
          prioritizationFeeLamports: "auto",
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!swapR.ok) throw new Error(`Jupiter swap failed: ${swapR.status}`);
      const { swapTransaction } = await swapR.json() as { swapTransaction: string };

      const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
      tx.sign([keypair]);
      signature = await conn.sendTransaction(tx, { skipPreflight: false });
      await conn.confirmTransaction(signature, "confirmed");
      position.signature = signature;
    } catch (e) {
      position.status = "failed";
      const positions = await getPositions(wallet);
      await savePositions(wallet, [...positions, position]);
      return { position, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const positions = await getPositions(wallet);
  await savePositions(wallet, [...positions, position]);
  return { position, signature };
}

// ── Close position ────────────────────────────────────────────────────────────

export async function closePosition(params: {
  wallet:   string;
  posId:    string;
  reason:   "stop_loss" | "take_profit" | "manual" | "emergency";
  isPaper:  boolean;
}): Promise<{ position: Position | null; error?: string }> {
  const { wallet, posId, reason, isPaper } = params;
  const positions = await getPositions(wallet);
  const idx = positions.findIndex(p => p.id === posId);
  if (idx === -1) return { position: null, error: "Position not found" };

  const pos = { ...positions[idx] };
  const currentPriceSol = await getTokenPriceSol(pos.mint);

  pos.closedAt      = Date.now();
  pos.status        = "closed";
  pos.closedReason  = reason;
  pos.exitPriceSol  = currentPriceSol ?? pos.entryPriceSol;
  pos.pnlSol        = pos.entryPriceSol > 0
    ? (pos.exitPriceSol - pos.entryPriceSol) / pos.entryPriceSol * pos.amountSol
    : 0;
  pos.pnlPct = pos.entryPriceSol > 0
    ? ((pos.exitPriceSol - pos.entryPriceSol) / pos.entryPriceSol) * 100
    : 0;

  if (!isPaper) {
    try {
      if (!GEASS_WALLET_PRIVKEY) throw new Error("GEASS_WALLET_PRIVKEY not set");
      const keypair    = Keypair.fromSecretKey(bs58.decode(GEASS_WALLET_PRIVKEY.replace(/[^1-9A-HJ-NP-Za-km-z]/g, "")));
      const conn       = new Connection(SOLANA_RPC, "confirmed");
      const SOL_MINT   = "So11111111111111111111111111111111111111112";
      const tokenLamports = Math.floor(pos.tokenAmount * 1e6); // approximate

      const quoteR = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${pos.mint}&outputMint=${SOL_MINT}&amount=${tokenLamports}&slippageBps=200`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!quoteR.ok) throw new Error(`Jupiter quote failed: ${quoteR.status}`);
      const quote = await quoteR.json();

      const swapR = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse:            quote,
          userPublicKey:            keypair.publicKey.toBase58(),
          wrapAndUnwrapSol:         true,
          dynamicComputeUnitLimit:  true,
          prioritizationFeeLamports: "auto",
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!swapR.ok) throw new Error(`Jupiter swap failed: ${swapR.status}`);
      const { swapTransaction } = await swapR.json() as { swapTransaction: string };

      const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
      tx.sign([keypair]);
      const sig = await conn.sendTransaction(tx, { skipPreflight: false });
      await conn.confirmTransaction(sig, "confirmed");
      pos.exitSignature = sig;
    } catch (e) {
      console.error("[aiTrading] closePosition live error:", e);
      // Still mark as closed in DB even if tx failed
    }
  }

  positions[idx] = pos;
  await savePositions(wallet, positions);

  // Update stats
  const stats = await getStats(wallet);
  stats.totalTrades++;
  if ((pos.pnlSol ?? 0) > 0) stats.winCount++; else stats.lossCount++;
  stats.totalPnlSol  += pos.pnlSol ?? 0;
  stats.winRate       = stats.totalTrades > 0 ? (stats.winCount / stats.totalTrades) * 100 : 0;
  stats.avgPnlPct     = stats.totalTrades > 0 ? (stats.totalPnlSol / stats.totalTrades) * 100 : 0;
  if ((pos.pnlSol ?? 0) < 0) stats.dailyLossSol += Math.abs(pos.pnlSol ?? 0);
  await saveStats(wallet, stats);

  return { position: pos };
}

// ── Monitor open positions (check SL/TP) ─────────────────────────────────────

export async function monitorPositions(wallet: string, isPaper: boolean): Promise<{ closed: Position[] }> {
  const positions = await getPositions(wallet);
  const open      = positions.filter(p => p.status === "open");
  const closed: Position[] = [];

  for (const pos of open) {
    const currentPrice = await getTokenPriceSol(pos.mint);
    if (!currentPrice || !pos.entryPriceSol) continue;

    const pnlPct = ((currentPrice - pos.entryPriceSol) / pos.entryPriceSol) * 100;

    if (pnlPct <= -pos.stopLossPct) {
      const { position } = await closePosition({ wallet, posId: pos.id, reason: "stop_loss", isPaper });
      if (position) closed.push(position);
    } else if (pnlPct >= pos.takeProfitPct) {
      const { position } = await closePosition({ wallet, posId: pos.id, reason: "take_profit", isPaper });
      if (position) closed.push(position);
    }
  }

  return { closed };
}

// ── Emergency stop ────────────────────────────────────────────────────────────

export async function emergencyStop(wallet: string, isPaper: boolean): Promise<{ closedCount: number }> {
  const positions = await getPositions(wallet);
  const open      = positions.filter(p => p.status === "open");
  let closedCount = 0;

  for (const pos of open) {
    const { error } = await closePosition({ wallet, posId: pos.id, reason: "emergency", isPaper });
    if (!error) closedCount++;
  }

  return { closedCount };
}

// ── Delete position record ────────────────────────────────────────────────────

export async function deletePosition(wallet: string, posId: string): Promise<void> {
  const positions = await getPositions(wallet);
  await savePositions(wallet, positions.filter(p => p.id !== posId));
}

// ── Clear all history ─────────────────────────────────────────────────────────

export async function clearHistory(wallet: string): Promise<void> {
  const positions = await getPositions(wallet);
  await savePositions(wallet, positions.filter(p => p.status === "open"));
}
