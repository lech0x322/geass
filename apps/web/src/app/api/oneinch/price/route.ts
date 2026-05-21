import { NextRequest, NextResponse } from "next/server";
import { ONEINCH_API_KEY, ONEINCH_BASE, SOLANA_CHAIN_ID } from "@/lib/env";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/oneinch/price?tokens=addr1,addr2&chain=1399811149
 * Proxies 1inch Spot Price API. Returns { [address]: priceUsd } map.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { bucket: "1inch-price", max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const tokens = searchParams.get("tokens") ?? "";
  const chain  = Number(searchParams.get("chain") ?? SOLANA_CHAIN_ID);

  if (!tokens) return NextResponse.json({ error: "tokens required" }, { status: 400 });
  if (!ONEINCH_API_KEY) return NextResponse.json({ error: "1inch API key not configured" }, { status: 503 });

  const url = `${ONEINCH_BASE}/price/v1.1/${chain}?tokens=${encodeURIComponent(tokens)}&currency=USD`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ONEINCH_API_KEY}`, Accept: "application/json" },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `1inch price ${res.status}`, detail: text }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
