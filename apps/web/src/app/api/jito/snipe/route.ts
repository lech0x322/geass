import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { jitoSnipe } from "@/lib/server/jitoService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "jito-snipe", max: 5, windowMs: 60_000 });
  if (limited) return limited;

  let body: { mint: string; amount?: number; slippage?: number; tipSol?: number; pool?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.mint) return NextResponse.json({ error: "Missing mint" }, { status: 400 });

  try {
    const result = await jitoSnipe({
      mint:    body.mint,
      amount:  body.amount  ?? 0.01,
      slippage: body.slippage ?? 10,
      tipSol:  body.tipSol  ?? 0.003,
      pool:    body.pool    ?? "auto",
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
