import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { apiTrade, localTrade } from "@/lib/server/pumpTrade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AutoSnipeBody {
  mint: string;
  amount?: number;
  slippage?: number;
  priorityFee?: number;
  pool?: string;
  // "api" uses PumpPortal managed signing (default); "local" uses server keypair + RPC
  method?: "api" | "local";
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "autosnipe", max: 5, windowMs: 60_000 });
  if (limited) return limited;

  let body: AutoSnipeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.mint) {
    return NextResponse.json({ error: "Missing mint" }, { status: 400 });
  }

  const params = {
    action: "buy" as const,
    mint:           body.mint,
    amount:         body.amount         ?? 0.01,
    denominatedInSol: "true" as const,
    slippage:       body.slippage       ?? 10,
    priorityFee:    body.priorityFee    ?? 0.00005,
    pool:           body.pool           ?? "auto",
  };

  try {
    const result = body.method === "local"
      ? await localTrade(params)
      : await apiTrade(params);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
