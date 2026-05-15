import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TradeBody {
  publicKey: string;
  action: "buy" | "sell" | "create";
  mint?: string;
  amount: number | string;
  denominatedInSol?: "true" | "false";
  slippage?: number;
  priorityFee?: number;
  pool?: string;
  tokenMetadata?: { name: string; symbol: string; uri: string };
}

export async function POST(request: Request) {
  let body: TradeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.publicKey || !body.action) {
    return NextResponse.json({ error: "Missing publicKey or action" }, { status: 400 });
  }

  try {
    const upstream = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: `pumpportal ${upstream.status}: ${text.slice(0, 200)}` },
        { status: upstream.status },
      );
    }
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
