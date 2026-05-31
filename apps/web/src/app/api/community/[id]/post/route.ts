import { NextResponse } from "next/server";
import { addPost, deletePost, editPost, getCommunity } from "@/lib/server/community";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { HELIUS_KEY, HELIUS_RPC } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function getTokenBalance(wallet: string, mint: string): Promise<number> {
  if (!HELIUS_KEY) return 0;
  try {
    const body = {
      jsonrpc: "2.0", id: 1,
      method: "getTokenAccountsByOwner",
      params: [wallet, { mint }, { encoding: "jsonParsed" }],
    };
    const r = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!r.ok) return 0;
    const d = await r.json();
    const accounts: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }[] =
      d?.result?.value ?? [];
    return accounts.reduce((sum, a) => sum + (a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function POST(req: Request, { params }: Params) {
  const limited = enforceRateLimit(req, { bucket: "community_post", max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet      = String(body.wallet ?? "").trim();
  const alias       = String(body.alias  ?? "").trim().slice(0, 24);
  const authorEmoji = String(body.authorEmoji ?? "👤").slice(0, 4);
  const text        = String(body.text   ?? "").trim();
  const type        = (body.type === "call" || body.type === "buy") ? body.type : "text" as const;
  const tokenMint   = body.tokenMint ? String(body.tokenMint).trim() : undefined;
  const tokenSym    = body.tokenSym  ? String(body.tokenSym).trim().slice(0, 10) : undefined;

  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  if (!text)   return NextResponse.json({ error: "Post text required" }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ error: "Post too long" }, { status: 400 });

  // Token-gate check
  const community = await getCommunity(id);
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  if (community.minTokensToPost > 0 && community.tokenMint) {
    const balance = await getTokenBalance(wallet, community.tokenMint);
    if (balance < community.minTokensToPost) {
      return NextResponse.json({
        error: `Need ≥${community.minTokensToPost} ${community.tokenSymbol ?? "tokens"} to post`,
        required: community.minTokensToPost, balance,
      }, { status: 403 });
    }
  }

  const post = await addPost(id, wallet, alias, authorEmoji, text, type, tokenMint, tokenSym);
  if (!post) return NextResponse.json({ error: "Not a member or community not found" }, { status: 403 });

  return NextResponse.json({ post, flagged: post.flagged ?? false });
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
