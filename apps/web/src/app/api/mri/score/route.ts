export const runtime    = "nodejs";
export const dynamic    = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { computeMri } from "@/lib/server/mriEngine";

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) {
    return NextResponse.json({ error: "mint is required" }, { status: 400 });
  }

  const score = await computeMri(mint);
  if (!score) {
    return NextResponse.json({ error: "token not found or too old" }, { status: 404 });
  }

  return NextResponse.json(score);
}
