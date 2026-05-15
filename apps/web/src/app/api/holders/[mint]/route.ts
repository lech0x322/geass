import { NextResponse } from "next/server";
import { topHolderInfo } from "@/lib/server/helius";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const limited = enforceRateLimit(req, { bucket: "holders", max: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { mint } = await params;
  if (!mint || mint.length < 32) {
    return NextResponse.json({ error: "Invalid mint" }, { status: 400 });
  }
  const info = await topHolderInfo(mint);
  return NextResponse.json(info ?? { holders: 0, topPct: 0 });
}
