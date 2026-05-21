import { NextRequest, NextResponse } from "next/server";
import { ONEINCH_API_KEY, ONEINCH_BASE, SOLANA_CHAIN_ID } from "@/lib/env";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface SwapQuoteRequest {
  src:            string;
  dst:            string;
  amount:         string;
  from:           string;
  chain?:         number;
  quoteOnly?:     boolean;
  slippage?:      number;
  preferredType?: "classic" | "fusion" | "crosschain";
  dstChain?:      number;
}

/**
 * POST /api/oneinch/swap  — build swap / quote via 1inch
 * GET  /api/oneinch/swap?src=&dst=&amount=&from=&chain=  — quick quote
 */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { bucket: "1inch-swap", max: 30, windowMs: 60_000 });
  if (limited) return limited;
  if (!ONEINCH_API_KEY) return NextResponse.json({ error: "1inch API key not configured" }, { status: 503 });

  const body = await request.json() as SwapQuoteRequest;
  const { src, dst, amount, from, chain = SOLANA_CHAIN_ID, quoteOnly = true, slippage = 0.5, preferredType, dstChain } = body;

  if (!src || !dst || !amount || !from)
    return NextResponse.json({ error: "src, dst, amount, from are required" }, { status: 400 });

  const payload: Record<string, unknown> = { src, dst, amount, from, slippage };
  if (quoteOnly)     payload.quoteOnly     = true;
  if (preferredType) payload.preferredType = preferredType;
  if (dstChain)      payload.dstChain      = dstChain;

  const res = await fetch(`${ONEINCH_BASE}/swap/v6.0/${chain}/swap`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ONEINCH_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `1inch swap ${res.status}`, detail: text }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { bucket: "1inch-swap", max: 30, windowMs: 60_000 });
  if (limited) return limited;
  if (!ONEINCH_API_KEY) return NextResponse.json({ error: "1inch API key not configured" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const chain = searchParams.get("chain") ?? String(SOLANA_CHAIN_ID);
  const qs = new URLSearchParams(searchParams);
  qs.delete("chain");

  const res = await fetch(`${ONEINCH_BASE}/swap/v6.0/${chain}/quote?${qs}`, {
    headers: { Authorization: `Bearer ${ONEINCH_API_KEY}`, Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `1inch quote ${res.status}`, detail: text }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
