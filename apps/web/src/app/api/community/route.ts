import { NextResponse } from "next/server";
import { listCommunities, createCommunity } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLORS = ["#ef4444","#f97316","#eab308","#10b981","#3b82f6","#a855f7","#ec4899","#14b8a6"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? undefined;
  const communities = (await listCommunities(wallet)).map(c => ({
    id: c.id, name: c.name, description: c.description, type: c.type,
    owner: c.owner, memberCount: c.members.length, postCount: c.posts.length,
    createdAt: c.createdAt, emoji: c.emoji, color: c.color, tags: c.tags,
    isMember: wallet ? c.members.includes(wallet) : false,
  }));
  return NextResponse.json({ communities });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name  = String(body.name ?? "").trim().slice(0, 40);
  const desc  = String(body.description ?? "").trim().slice(0, 200);
  const type  = body.type === "private" ? "private" : "public";
  const emoji = String(body.emoji ?? "🌐").slice(0, 4);
  const color = COLORS.includes(String(body.color)) ? String(body.color) : COLORS[Math.floor(Math.random() * COLORS.length)];
  const tags  = Array.isArray(body.tags) ? (body.tags as string[]).map(t => String(t).slice(0, 20)).slice(0, 5) : [];
  const owner = String(body.owner ?? "").trim();
  const ownerAlias = String(body.ownerAlias ?? "").trim().slice(0, 24);

  if (!name || name.length < 3) return NextResponse.json({ error: "Name must be at least 3 characters" }, { status: 400 });
  if (!owner) return NextResponse.json({ error: "Owner wallet required" }, { status: 400 });

  const price = typeof body.price === "number" && body.price > 0 ? body.price : undefined;
  const community = await createCommunity({ name, description: desc, type, emoji, color, tags, owner, ownerAlias, price });
  return NextResponse.json({ community });
}
