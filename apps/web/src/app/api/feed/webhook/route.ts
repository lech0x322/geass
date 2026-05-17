import { NextResponse } from "next/server";
import { HELIUS_WEBHOOK_AUTH } from "@/lib/env";
import { publishKolTrade } from "@/lib/server/kolFeed";
import { parseKolTrade, type HeliusTxEnhanced } from "@/lib/server/kolParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (HELIUS_WEBHOOK_AUTH && auth !== HELIUS_WEBHOOK_AUTH) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const txs: HeliusTxEnhanced[] = Array.isArray(body) ? body : [body as HeliusTxEnhanced];
  let parsed = 0;
  for (const tx of txs) {
    const trade = parseKolTrade(tx);
    if (trade) { publishKolTrade(trade); parsed++; }
  }

  return NextResponse.json({ ok: true, parsed });
}
