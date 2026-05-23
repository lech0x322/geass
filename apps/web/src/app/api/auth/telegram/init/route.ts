import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "tg-otp-init", max: 10, windowMs: 60_000 });
  if (limited) return limited;

  const code = genCode();
  // Store pending OTP for 5 minutes
  await redis.set(`tg:otp:${code}`, { verified: false, chatId: null }, 300);

  return NextResponse.json({ code });
}
