import { NextRequest, NextResponse } from "next/server";
import {
  openPosition, passesRiskCheck, getPositions, DEFAULT_RISK,
  type TradingSignal, type TradeDecision, type RiskConfig,
} from "@/lib/server/aiTradingEngine";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { bucket: "ai-execute", max: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: {
    signal:   TradingSignal;
    decision: TradeDecision;
    wallet:   string;
    isPaper:  boolean;
    risk?:    Partial<RiskConfig>;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { signal, decision, wallet, isPaper = true, risk: riskOverride } = body;
  if (!signal?.mint)  return NextResponse.json({ error: "signal required" }, { status: 400 });
  if (!decision)      return NextResponse.json({ error: "decision required" }, { status: 400 });
  if (!wallet)        return NextResponse.json({ error: "wallet required" }, { status: 400 });
  if (decision.action !== "buy") return NextResponse.json({ error: "Only buy execution supported" }, { status: 400 });

  const risk      = { ...DEFAULT_RISK, ...riskOverride } as RiskConfig;
  const riskCheck = await passesRiskCheck(wallet, signal, decision, risk);
  if (!riskCheck.ok) {
    return NextResponse.json({ error: `Risk block: ${riskCheck.reason}` }, { status: 409 });
  }

  const result = await openPosition({ wallet, signal, decision, isPaper });

  if (result.error) {
    return NextResponse.json({ error: result.error, position: result.position }, { status: 502 });
  }

  return NextResponse.json({ position: result.position, signature: result.signature });
}
