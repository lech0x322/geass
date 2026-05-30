import { NextResponse } from "next/server";
import { getProfile, setProfile } from "@/lib/server/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.trim();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const profile = await getProfile(wallet);
  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet   = String(body.wallet   ?? "").trim();
  const username = String(body.username ?? "").trim();
  const emoji    = String(body.emoji    ?? "🧠").slice(0, 4);

  if (!wallet)   return NextResponse.json({ error: "wallet required" }, { status: 400 });
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const result = await setProfile(wallet, username, emoji);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "Username already taken" ? 409 : 400 });

  const profile = await getProfile(wallet);
  return NextResponse.json({ profile });
}
