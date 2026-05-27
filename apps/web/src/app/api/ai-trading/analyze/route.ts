import { NextRequest, NextResponse } from "next/server";
import {
  aiAnalyzeSignal, passesRiskCheck, getPositions,
  type TradingSignal, type RiskConfig, DEFAULT_RISK,
} from "@/lib/server/aiTradingEngine";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { bucket: "ai-analyze", max: 20, windowMs: 60_000 });
  if (limited) return limited;

  let body: { signal: TradingSignal; portfolioSol?: number; risk?: Partial<RiskConfig>; wallet: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { signal, portfolioSol = 1.0, wallet, risk: riskOverride } = body;
  if (!signal?.mint) return NextResponse.json({ error: "signal.mint required" }, { status: 400 });
  if (!wallet)       return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const risk      = { ...DEFAULT_RISK, ...riskOverride } as RiskConfig;
  const positions = await getPositions(wallet);
  const openCount = positions.filter(p => p.status === "open").length;

  const decision = await aiAnalyzeSignal(signal, portfolioSol, risk, openCount);

  // Run risk check
  const riskCheck = await passesRiskCheck(wallet, signal, decision, risk);
  if (!riskCheck.ok) {
    return NextResponse.json({
      decision: { ...decision, action: "skip", reason: `Risk block: ${riskCheck.reason}` },
      riskBlocked: true,
      riskReason: riskCheck.reason,
    });
  }

  return NextResponse.json({ decision, riskBlocked: false });
}
