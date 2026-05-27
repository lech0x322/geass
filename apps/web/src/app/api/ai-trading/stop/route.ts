import { NextRequest, NextResponse } from "next/server";
import { emergencyStop } from "@/lib/server/aiTradingEngine";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { wallet: string; isPaper?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { wallet, isPaper = true } = body;
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const { closedCount } = await emergencyStop(wallet, isPaper);
  return NextResponse.json({ ok: true, closedCount });
}
