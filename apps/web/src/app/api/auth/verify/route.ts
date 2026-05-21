import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/server/redis";
import { buildSiwsMessage, verifySiwsSignature, issueJwt } from "@/lib/server/siws";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "geass_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "siws-verify", max: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: { address: string; nonce: string; signature: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { address, nonce, signature } = body;
  if (!address || !nonce || !signature) {
    return NextResponse.json({ error: "address, nonce and signature are required" }, { status: 400 });
  }

  // Fetch and immediately invalidate nonce (single-use)
  const stored = await redis.get<{ issuedAt: string }>(`siws:nonce:${nonce}`);
  if (!stored) {
    return NextResponse.json({ error: "Nonce expired or invalid" }, { status: 401 });
  }
  await redis.set(`siws:nonce:${nonce}`, null, 1);

  const message = buildSiwsMessage(address, nonce, stored.issuedAt);
  const valid   = verifySiwsSignature(message, signature, address);
  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const token = await issueJwt(address);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });

  return NextResponse.json({ address });
}

export async function DELETE(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "siws-verify", max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
