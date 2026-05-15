import { NextResponse } from "next/server";
import { fetchTokenPair } from "@/lib/server/dexscreener";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (!mint || mint.length < 32) {
    return NextResponse.json({ error: "Invalid mint" }, { status: 400 });
  }
  const pair = await fetchTokenPair(mint);
  return NextResponse.json({ pair });
}
