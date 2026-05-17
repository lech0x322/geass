import { NextResponse } from "next/server";
import { fetchDexBatch, fetchDexToken } from "@/lib/server/dexscreener";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/dex?mint=ABC          → single mint
// GET /api/dex?mints=A,B,C,...   → batch (up to 30)
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "dex", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const single = (searchParams.get("mint") ?? "").trim();
  const batch  = (searchParams.get("mints") ?? "").trim();

  if (single) {
    const info = await fetchDexToken(single);
    return NextResponse.json(info);
  }
  if (batch) {
    const mints = batch.split(",").map(m => m.trim()).filter(Boolean).slice(0, 30);
    if (!mints.length) return NextResponse.json({ error: "No mints provided" }, { status: 400 });
    const map = await fetchDexBatch(mints);
    return NextResponse.json(Object.fromEntries(map));
  }
  return NextResponse.json({ error: "Provide ?mint= or ?mints=" }, { status: 400 });
}
