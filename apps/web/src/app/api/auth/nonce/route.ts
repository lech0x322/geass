import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { redis } from "@/lib/server/redis";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONCE_TTL_SECONDS = 300; // 5 minutes

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "siws-nonce", max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const nonce     = randomBytes(16).toString("hex");
  const issuedAt  = new Date().toISOString();

  await redis.set(`siws:nonce:${nonce}`, { issuedAt }, NONCE_TTL_SECONDS);

  return NextResponse.json({ nonce, issuedAt });
}
