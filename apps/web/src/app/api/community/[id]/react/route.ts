import { NextResponse } from "next/server";
import { reactToPost } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const postId   = String(body.postId   ?? "").trim();
  const reaction = String(body.reaction ?? "").trim();

  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });
  if (!["fire", "gem", "rug"].includes(reaction)) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });

  return NextResponse.json({ ok: reactToPost(id, postId, reaction as "fire" | "gem" | "rug").ok });
}
