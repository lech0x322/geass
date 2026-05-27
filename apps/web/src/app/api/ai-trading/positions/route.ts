import { NextRequest, NextResponse } from "next/server";
import {
  getPositions, getStats, closePosition, clearHistory,
} from "@/lib/server/aiTradingEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet  = req.nextUrl.searchParams.get("wallet");
  const filter  = req.nextUrl.searchParams.get("filter") ?? "all"; // "open" | "closed" | "all"
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const positions = await getPositions(wallet);
  const stats     = await getStats(wallet);

  const filtered = filter === "open"   ? positions.filter(p => p.status === "open")
                 : filter === "closed" ? positions.filter(p => p.status !== "open")
                 : positions;

  return NextResponse.json({
    positions: filtered.sort((a, b) => b.openedAt - a.openedAt),
    stats,
    total: filtered.length,
  });
}

export async function DELETE(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const posId  = req.nextUrl.searchParams.get("id");
  const isPaper = req.nextUrl.searchParams.get("paper") !== "false";
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  if (posId) {
    // Close specific position
    const { position, error } = await closePosition({ wallet, posId, reason: "manual", isPaper });
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ position });
  }

  // Clear closed history
  await clearHistory(wallet);
  return NextResponse.json({ ok: true });
}
