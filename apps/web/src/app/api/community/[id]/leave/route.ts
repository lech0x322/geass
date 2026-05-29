import { NextResponse } from "next/server";
import { leaveCommunity } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet = String(body.wallet ?? "").trim();
  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  return NextResponse.json({ ok: (await leaveCommunity(id, wallet)).ok });
}
