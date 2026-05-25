import { NextResponse } from "next/server";
import { addPost } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet    = String(body.wallet ?? "").trim();
  const alias     = String(body.alias  ?? "").trim().slice(0, 24);
  const text      = String(body.text   ?? "").trim();
  const tokenMint = body.tokenMint ? String(body.tokenMint).trim() : undefined;

  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  if (!text)   return NextResponse.json({ error: "Post text required" }, { status: 400 });

  const post = addPost(id, wallet, alias, text, tokenMint);
  if (!post) return NextResponse.json({ error: "Not a member or community not found" }, { status: 403 });
  return NextResponse.json({ post });
}
