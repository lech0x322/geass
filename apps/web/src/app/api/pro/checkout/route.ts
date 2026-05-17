import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { PRO_TREASURY_WALLET, PRO_PRICE_SOL, PRO_DURATION_DAYS } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_RE = /^[1-9A-HJ-NP-Za-km-z]{6,10}$/;
const REFERRAL_DISCOUNT = 0.10; // 10 %

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "pro_checkout", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  if (!PRO_TREASURY_WALLET) {
    return NextResponse.json({ error: "PRO_TREASURY_WALLET not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim();
  const hasRef = CODE_RE.test(ref);
  const amountSol = hasRef
    ? Math.round(PRO_PRICE_SOL * (1 - REFERRAL_DISCOUNT) * 1000) / 1000
    : PRO_PRICE_SOL;

  try {
    const res = await heliusRpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
      "getLatestBlockhash",
      [{ commitment: "confirmed" }],
    );
    const bh = res?.value;
    if (!bh?.blockhash) throw new Error("no blockhash");
    return NextResponse.json({
      treasury: PRO_TREASURY_WALLET,
      amountSol,
      durationDays: PRO_DURATION_DAYS,
      blockhash: bh.blockhash,
      lastValidBlockHeight: bh.lastValidBlockHeight,
      ref: hasRef ? ref : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
