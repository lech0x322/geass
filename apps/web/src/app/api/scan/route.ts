import { NextResponse } from "next/server";
import { runScan } from "@/lib/server/scanner";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { notifyGem } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "scan", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(request.url);
  const count = Math.min(20, Math.max(1, parseInt(url.searchParams.get("count") || "6", 10)));
  const result = await runScan(count);
  // Fire-and-forget Telegram alerts for high-score gems
  for (const g of result.gems) {
    if (g.score >= 75) notifyGem(g.sym, g.id, g.score, g.tier, g.reasons).catch(() => {});
  }
  return NextResponse.json(result, { status: result.error ? 503 : 200 });
}
