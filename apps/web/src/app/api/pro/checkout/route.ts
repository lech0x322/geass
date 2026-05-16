import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";
import { ensureProWebhook } from "@/lib/server/heliusWebhook";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { PRO_TREASURY_WALLET, PRO_PRICE_SOL, PRO_DURATION_DAYS } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "pro_checkout", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  if (!PRO_TREASURY_WALLET) {
    return NextResponse.json({ error: "PRO_TREASURY_WALLET not configured" }, { status: 503 });
  }

  // Lazy idempotent webhook registration. Doesn't block — failure is logged.
  void ensureProWebhook(process.env.WEBHOOK_BASE_URL, process.env.HELIUS_WEBHOOK_AUTH);

  try {
    const res = await heliusRpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
      "getLatestBlockhash",
      [{ commitment: "confirmed" }],
    );
    const bh = res?.value;
    if (!bh?.blockhash) throw new Error("no blockhash");
    return NextResponse.json({
      treasury: PRO_TREASURY_WALLET,
      amountSol: PRO_PRICE_SOL,
      durationDays: PRO_DURATION_DAYS,
      blockhash: bh.blockhash,
      lastValidBlockHeight: bh.lastValidBlockHeight,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
