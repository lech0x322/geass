import { NextResponse } from "next/server";
import { getCommunity } from "@/lib/server/community";

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
