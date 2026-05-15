import { NextResponse } from "next/server";
import { fetchTokenPair } from "@/lib/server/dexscreener";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const limited = enforceRateLimit(req, { bucket: "token", max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { mint } = await params;
  if (!mint || mint.length < 32) {
    return NextResponse.json({ error: "Invalid mint" }, { status: 400 });
  }
  const pair = await fetchTokenPair(mint);
  return NextResponse.json({ pair });
}
