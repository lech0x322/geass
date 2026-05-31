import { NextResponse } from "next/server";
import { listCommunities, createCommunity } from "@/lib/server/community";
import { HELIUS_KEY, HELIUS_API } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLORS = ["#ef4444","#f97316","#eab308","#10b981","#3b82f6","#a855f7","#ec4899","#14b8a6"];

interface TokenMeta {
  symbol?: string; logo?: string; price?: number; mcap?: number;
}

async function fetchTokenMeta(mint: string): Promise<TokenMeta> {
  // Try DexScreener first
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(5_000), cache: "no-store",
    });
    if (r.ok) {
      const d = await r.json();
      const pair = d?.pairs?.[0];
      if (pair) {
        return {
          symbol: pair.baseToken?.symbol,
          logo:   pair.info?.imageUrl ?? undefined,
          price:  pair.priceUsd ? parseFloat(pair.priceUsd) : undefined,
          mcap:   pair.marketCap ?? undefined,
        };
      }
    }
  } catch { /* fall through */ }

  // Fallback: Helius getAsset
  if (HELIUS_KEY) {
    try {
      const r = await fetch(`${HELIUS_API}/token-metadata?api-key=${HELIUS_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mintAccounts: [mint], includeOffChain: true }),
        signal: AbortSignal.timeout(5_000), cache: "no-store",
      });
      if (r.ok) {
        const data = await r.json();
        const asset = Array.isArray(data) ? data[0] : null;
        if (asset) {
          return {
            symbol: asset.onChainMetadata?.metadata?.data?.symbol ?? asset.account?.data?.parsed?.info?.symbol,
            logo:   asset.offChainMetadata?.metadata?.image ?? undefined,
          };
        }
      }
    } catch { /* ignore */ }
  }

  return {};
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? undefined;
  const communities = (await listCommunities(wallet)).map(c => ({
    id: c.id, name: c.name, description: c.description, type: c.type,
    owner: c.owner, memberCount: c.members.length, postCount: c.posts.length,
    createdAt: c.createdAt, emoji: c.emoji, color: c.color, tags: c.tags,
    isMember: wallet ? c.members.includes(wallet) : false,
    tokenMint: c.tokenMint, tokenSymbol: c.tokenSymbol,
    tokenLogo: c.tokenLogo, tokenPrice: c.tokenPrice, tokenMcap: c.tokenMcap,
    minTokensToPost: c.minTokensToPost,
    sentiment: c.sentiment,
  }));
  return NextResponse.json({ communities });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name     = String(body.name ?? "").trim().slice(0, 40);
  const desc     = String(body.description ?? "").trim().slice(0, 200);
  const type     = body.type === "private" ? "private" : "public";
  const emoji    = String(body.emoji ?? "🌐").slice(0, 4);
  const color    = COLORS.includes(String(body.color)) ? String(body.color) : COLORS[Math.floor(Math.random() * COLORS.length)];
  const tags     = Array.isArray(body.tags) ? (body.tags as string[]).map(t => String(t).slice(0, 20)).slice(0, 5) : [];
  const owner    = String(body.owner ?? "").trim();
  const ownerAlias = String(body.ownerAlias ?? "").trim().slice(0, 24);
  const ownerEmoji = String(body.ownerEmoji ?? "👤").slice(0, 4);
  const tokenMint  = body.tokenMint ? String(body.tokenMint).trim() : undefined;
  const minTokensToPost = typeof body.minTokensToPost === "number" ? Math.max(0, body.minTokensToPost) : 0;

  if (!name || name.length < 3) return NextResponse.json({ error: "Name must be at least 3 characters" }, { status: 400 });
  if (!owner) return NextResponse.json({ error: "Owner wallet required" }, { status: 400 });

  const price = typeof body.price === "number" && body.price > 0 ? body.price : undefined;

  // Fetch token metadata if mint provided
  let tokenSymbol: string | undefined, tokenLogo: string | undefined;
  let tokenPrice: number | undefined, tokenMcap: number | undefined;
  if (tokenMint) {
    const meta = await fetchTokenMeta(tokenMint);
    tokenSymbol = meta.symbol;
    tokenLogo   = meta.logo;
    tokenPrice  = meta.price;
    tokenMcap   = meta.mcap;
  }

  const community = await createCommunity({
    name, description: desc, type, emoji, color, tags, owner, ownerAlias, ownerEmoji, price,
    tokenMint, tokenSymbol, tokenLogo, tokenPrice, tokenMcap, minTokensToPost,
  });
  return NextResponse.json({ community });
}
