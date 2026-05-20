import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HELIUS_WEBHOOK_AUTH } from "@/lib/env";
import { publishKolTrade } from "@/lib/server/kolFeed";
import {
  parseKolTrade,
  extractPumpTrade,
  smartWalletToFeedTrade,
  type HeliusTxEnhanced,
} from "@/lib/server/kolParser";
import { recordTrade, isSmartWallet } from "@/lib/server/smartWallets";
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
  let smartTrades = 0;
  for (const tx of payload) {
    const enhanced = tx as unknown as HeliusTxEnhanced;

    // 1) Hardcoded KOLs always publish.
    const kolTrade = parseKolTrade(enhanced);
    if (kolTrade) {
      publishKolTrade(kolTrade);
      kolTrades++;
      continue;
    }

    // 2) Auto-discovery: extract any pump.fun trader, score it, publish if smart.
    const pump = extractPumpTrade(enhanced);
    if (!pump) continue;
    const stats = await recordTrade(pump);
    if (stats && isSmartWallet(stats)) {
      const sig = enhanced.signature ?? `${pump.ts}-${pump.wallet.slice(0, 6)}`;
      publishKolTrade(smartWalletToFeedTrade(pump, sig));
      smartTrades++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: payload.length,
    kolTrades,
    smartTrades,
  });
}

/** Health check */
export async function GET() {
  return NextResponse.json({ ok: true, ready: true });
}
