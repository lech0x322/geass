import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TELEGRAM_BOT_TOKEN, APP_BASE_URL } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_URL = `${APP_BASE_URL}/api/auth/telegram/webhook`;
let webhookRegistered = false;

async function ensureWebhookRegistered() {
  if (webhookRegistered) return;
  try {
    const info = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const { result } = await info.json() as { result?: { url?: string } };
    if (result?.url === WEBHOOK_URL) { webhookRegistered = true; return; }
    const setRes  = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url: WEBHOOK_URL, allowed_updates: ["message"] }),
    });
    const setData = await setRes.json() as { ok: boolean; description?: string };
    if (setData.ok) webhookRegistered = true;
    else console.error("[tg] setWebhook failed:", setData.description);
  } catch { /* non-fatal */ }
}

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  // Auto-register webhook with Telegram on first login attempt
  await ensureWebhookRegistered();

  const code = randomCode();
  await redis.set(`tg:otp:${code}`, "pending", 300);

  return NextResponse.json({ code });
}
