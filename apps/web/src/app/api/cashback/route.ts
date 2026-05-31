import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { getOrInit, CASHBACK_RATE } from "@/lib/server/cashback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cashback?wallet=... */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "cashback_get", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const wallet = new URL(req.url).searchParams.get("wallet") ?? "";
  if (!wallet || wallet.length < 32)
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });

  return NextResponse.json(await getOrInit(wallet));
}

/** POST /api/cashback  { wallet, tradeSol }
 *  Called after each successful trade to credit 0.5% cashback.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "cashback_record", max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const body = await req.json().catch(() => ({})) as { wallet?: string; tradeSol?: number };
  const { wallet, tradeSol } = body;

  if (!wallet || wallet.length < 32)
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  if (!tradeSol || tradeSol <= 0)
    return NextResponse.json({ error: "Invalid tradeSol" }, { status: 400 });

  const earned = tradeSol * CASHBACK_RATE;
  const current = await getOrInit(wallet);

  await redis.hset(`cashback:${wallet}`, "unclaimed",  current.unclaimed + earned);
  await redis.hset(`cashback:${wallet}`, "tradeCount", current.tradeCount + 1);

  return NextResponse.json({ earned, unclaimed: current.unclaimed + earned });
}
