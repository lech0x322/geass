import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/server/siws";
import { redis } from "@/lib/server/redis";
import type { TpSlRule } from "@/lib/types/tpsl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redisKey(wallet: string) {
  return `tpsl:${wallet}`;
}

async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("geass_session")?.value;
  if (!token) return null;
  const session = await verifyJwt(token);
  return session?.address ?? null;
}

async function getRules(wallet: string): Promise<TpSlRule[]> {
  const raw = await redis.get<TpSlRule[]>(redisKey(wallet));
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [];
}

/** GET /api/tpsl?wallet=<addr> */
export async function GET(req: Request) {
  const sessionAddress = await getSession();
  if (!sessionAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  if (wallet !== sessionAddress) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await getRules(wallet);
  return NextResponse.json({ rules });
}

/** POST /api/tpsl  body: { rule: TpSlRule } */
export async function POST(req: Request) {
  const sessionAddress = await getSession();
  if (!sessionAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rule?: TpSlRule };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rule = body.rule;
  if (!rule || typeof rule !== "object") {
    return NextResponse.json({ error: "rule is required" }, { status: 400 });
  }

  if (rule.wallet !== sessionAddress) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getRules(rule.wallet);
  const idx = existing.findIndex(r => r.id === rule.id);
  if (idx >= 0) {
    existing[idx] = rule;
  } else {
    existing.push(rule);
  }

  await redis.set(redisKey(rule.wallet), existing);
  return NextResponse.json({ ok: true });
}

/** DELETE /api/tpsl?id=<id>&wallet=<addr> */
export async function DELETE(req: Request) {
  const sessionAddress = await getSession();
  if (!sessionAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const wallet = searchParams.get("wallet");

  if (!id || !wallet) {
    return NextResponse.json({ error: "id and wallet are required" }, { status: 400 });
  }

  if (wallet !== sessionAddress) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getRules(wallet);
  const filtered = existing.filter(r => r.id !== id);
  await redis.set(redisKey(wallet), filtered);
  return NextResponse.json({ ok: true });
}
