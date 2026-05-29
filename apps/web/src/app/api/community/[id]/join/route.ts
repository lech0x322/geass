import { NextResponse } from "next/server";
import { joinCommunity } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet     = String(body.wallet ?? "").trim();
  const inviteCode = body.inviteCode ? String(body.inviteCode).trim() : undefined;

  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  const result = await joinCommunity(id, wallet, inviteCode);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "Community not found" ? 404 : 403 });
  return NextResponse.json({ ok: true });
}
