import { NextResponse } from "next/server";
import { getCommunity, updateCommunity } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";

  const c = await getCommunity(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canView = c.type === "public" || c.members.includes(wallet) || c.owner === wallet;
  if (!canView) return NextResponse.json({ error: "Private — invite code required" }, { status: 403 });

  return NextResponse.json({
    id: c.id, name: c.name, description: c.description, type: c.type,
    owner: c.owner, members: c.members, posts: c.posts,
    createdAt: c.createdAt, emoji: c.emoji, color: c.color, tags: c.tags,
    isMember: c.members.includes(wallet),
    isOwner:  c.owner === wallet,
    inviteCode: c.owner === wallet ? c.inviteCode : undefined,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet = String(body.wallet ?? "").trim();
  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  const result = await updateCommunity(id, wallet, {
    name:        body.name        !== undefined ? String(body.name)        : undefined,
    description: body.description !== undefined ? String(body.description) : undefined,
    type:        body.type === "public" || body.type === "private" ? body.type : undefined,
    emoji:       body.emoji       !== undefined ? String(body.emoji)       : undefined,
    color:       body.color       !== undefined ? String(body.color)       : undefined,
    tags:        Array.isArray(body.tags) ? (body.tags as unknown[]).map(String) : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "Not found" ? 404 : 403 });
  return NextResponse.json({ ok: true });
}
