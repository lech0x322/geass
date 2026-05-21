import { NextRequest, NextResponse } from "next/server";
import { ONEINCH_API_KEY, ONEINCH_BASE } from "@/lib/env";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EVM chains 1inch Portfolio supports
const PORTFOLIO_CHAINS = [1, 8453, 42161, 10, 137, 56]; // ETH, Base, Arbitrum, Optimism, Polygon, BSC

/**
 * GET /api/oneinch/portfolio?address=0x...&timerange=1month
 * Returns P&L + current value across EVM chains via 1inch Portfolio v4.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { bucket: "1inch-portfolio", max: 20, windowMs: 60_000 });
  if (limited) return limited;
  if (!ONEINCH_API_KEY) return NextResponse.json({ error: "1inch API key not configured" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const address   = searchParams.get("address");
  const timerange = searchParams.get("timerange") ?? "1month";
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const headers = { Authorization: `Bearer ${ONEINCH_API_KEY}`, Accept: "application/json" };

  const [pnlRes, valueRes] = await Promise.allSettled([
    Promise.all(PORTFOLIO_CHAINS.map(id =>
      fetch(`${ONEINCH_BASE}/portfolio/portfolio/v4/overview/erc20/profit_and_loss?addresses=${address}&chain_id=${id}&timerange=${timerange}`, { headers })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    )),
    Promise.all(PORTFOLIO_CHAINS.map(id =>
      fetch(`${ONEINCH_BASE}/portfolio/portfolio/v4/overview/erc20/current_value?addresses=${address}&chain_id=${id}`, { headers })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    )),
  ]);

  const pnlByChain:   Record<number, unknown> = {};
  const valueByChain: Record<number, unknown> = {};
  if (pnlRes.status   === "fulfilled") PORTFOLIO_CHAINS.forEach((id, i) => { if (pnlRes.value[i])   pnlByChain[id]   = pnlRes.value[i];   });
  if (valueRes.status === "fulfilled") PORTFOLIO_CHAINS.forEach((id, i) => { if (valueRes.value[i]) valueByChain[id] = valueRes.value[i]; });

  return NextResponse.json({ pnlByChain, valueByChain, chains: PORTFOLIO_CHAINS });
}
