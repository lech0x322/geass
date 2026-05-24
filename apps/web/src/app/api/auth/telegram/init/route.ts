import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TELEGRAM_BOT_TOKEN } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  const code = randomCode();
  // "pending" → bot hasn't received this code yet
  await redis.set(`tg:otp:${code}`, "pending", 300);

  return NextResponse.json({ code });
}
