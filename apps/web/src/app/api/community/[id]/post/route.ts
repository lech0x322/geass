import { NextResponse } from "next/server";
import { addPost, deletePost, editPost } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet    = String(body.wallet ?? "").trim();
  const alias     = String(body.alias  ?? "").trim().slice(0, 24);
  const text      = String(body.text   ?? "").trim();
  const tokenMint = body.tokenMint ? String(body.tokenMint).trim() : undefined;

  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  if (!text)   return NextResponse.json({ error: "Post text required" }, { status: 400 });

  const post = await addPost(id, wallet, alias, text, tokenMint);
  if (!post) return NextResponse.json({ error: "Not a member or community not found" }, { status: 403 });
  return NextResponse.json({ post });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const postId = String(body.postId ?? "").trim();
  const wallet = String(body.wallet ?? "").trim();
  const text   = String(body.text   ?? "").trim();

  if (!postId || !wallet || !text) return NextResponse.json({ error: "postId, wallet, text required" }, { status: 400 });

  const result = await editPost(id, postId, wallet, text);
  if (!result.ok) return NextResponse.json({ error: "Not authorized or not found" }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const postId = String(body.postId ?? "").trim();
  const wallet = String(body.wallet ?? "").trim();

  if (!postId || !wallet) return NextResponse.json({ error: "postId and wallet required" }, { status: 400 });

  const result = await deletePost(id, postId, wallet);
  if (!result.ok) return NextResponse.json({ error: "Not authorized or not found" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
