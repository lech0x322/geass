import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/server/siws";
import { redis } from "@/lib/server/redis";
import { Redis } from "@upstash/redis";
import type { TradeRecord } from "@/lib/types/trade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TRADES = 500;

/** Resolve the wallet from the session cookie. Returns null if unauthenticated. */
async function getSessionWallet(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("geass_session")?.value;
  if (!token) return null;
  const session = await verifyJwt(token);
  return session?.address ?? null;
}

function redisKey(wallet: string): string {
  return `trades:${wallet}`;
}

/** Upstash Redis client with list support (thin wrapper only exposes get/set/hash). */
function rawClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// ── GET /api/trades?wallet=<addr>&limit=50 ───────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 500);

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  // Validate caller is the owner of the requested wallet
  const sessionWallet = await getSessionWallet();
  if (!sessionWallet || sessionWallet !== wallet) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = rawClient();
  if (!client) {
    return NextResponse.json({ trades: [] });
  }

  try {
    // Stored newest-first: index 0 is most recent
    const raw = await client.lrange<TradeRecord>(redisKey(wallet), 0, limit - 1);
    const trades: TradeRecord[] = (raw ?? []).map(item =>
      typeof item === "string" ? (JSON.parse(item) as TradeRecord) : item,
    );
    return NextResponse.json({ trades });
  } catch (e) {
    console.error("[trades] GET error:", e);
    return NextResponse.json({ error: "failed to fetch trades" }, { status: 502 });
  }
}

// ── POST /api/trades ─────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const sessionWallet = await getSessionWallet();
  if (!sessionWallet) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { trade?: Omit<TradeRecord, "id"> };
  try {
    body = (await request.json()) as { trade?: Omit<TradeRecord, "id"> };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { trade } = body;
  if (!trade) {
    return NextResponse.json({ error: "trade required" }, { status: 400 });
  }

  // Enforce ownership — the trade's wallet must match the session
  if (trade.wallet !== sessionWallet) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const record: TradeRecord = {
    ...trade,
    id: `${trade.wallet}-${trade.signature}-${Date.now()}`,
  };

  const client = rawClient();
  if (!client) {
    // Redis unavailable — accept silently so the client doesn't error
    return NextResponse.json({ ok: true, id: record.id });
  }

  try {
    const key = redisKey(trade.wallet);
    // Prepend newest trade, then trim to MAX_TRADES
    await client.lpush(key, JSON.stringify(record));
    await client.ltrim(key, 0, MAX_TRADES - 1);
    return NextResponse.json({ ok: true, id: record.id });
  } catch (e) {
    console.error("[trades] POST error:", e);
    return NextResponse.json({ error: "failed to record trade" }, { status: 502 });
  }
}
