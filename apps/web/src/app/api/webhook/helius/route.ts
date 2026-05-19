import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HELIUS_WEBHOOK_AUTH } from "@/lib/env";
import { publishKolTrade } from "@/lib/server/kolFeed";
import { parseKolTrade, type HeliusTxEnhanced } from "@/lib/server/kolParser";
import type { HeliusWebhookPayload } from "@/types/helius";

export const dynamic = "force-dynamic";

/**
 * Generic Helius enhanced-webhook receiver.
 * Accepts an array of HeliusEnhancedTransaction objects.
 *
 * Auth: optional shared secret in `Authorization` header (HELIUS_WEBHOOK_AUTH).
 * Side-effect: KOL trades are extracted and pushed to the in-memory feed
 * so the SSE stream at /api/feed/stream picks them up automatically.
 */
export async function POST(req: NextRequest) {
  // Optional auth — if HELIUS_WEBHOOK_AUTH is set, require a match
  if (HELIUS_WEBHOOK_AUTH) {
    const got = req.headers.get("authorization") ?? "";
    if (got !== HELIUS_WEBHOOK_AUTH) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let payload: HeliusWebhookPayload;
  try {
    const body = await req.json();
    payload = Array.isArray(body) ? body : [];
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  if (!payload.length) return NextResponse.json({ ok: true, processed: 0 });

  let kolTrades = 0;
  for (const tx of payload) {
    const trade = parseKolTrade(tx as unknown as HeliusTxEnhanced);
    if (trade) {
      publishKolTrade(trade);
      kolTrades++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: payload.length,
    kolTrades,
  });
}

/** Health check */
export async function GET() {
  return NextResponse.json({ ok: true, ready: true });
}
