import { NextResponse } from "next/server";
import { TELEGRAM_BOT_TOKEN, APP_BASE_URL } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_URL = `${APP_BASE_URL}/api/auth/telegram/webhook`;

// GET — show current webhook info
export async function GET() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 503 });
  }
  const res  = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
  const data = await res.json() as { ok: boolean; result?: { url?: string } };
  return NextResponse.json({
    currentWebhook:  data?.result?.url ?? null,
    expectedWebhook: WEBHOOK_URL,
    matched:         data?.result?.url === WEBHOOK_URL,
    raw:             data,
  });
}

// POST — register (or re-register) the webhook with Telegram
export async function POST() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 503 });
  }
  const res  = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ url: WEBHOOK_URL, allowed_updates: ["message"] }),
  });
  const data = await res.json() as { ok: boolean; description?: string };
  return NextResponse.json({ ok: data?.ok ?? false, webhookUrl: WEBHOOK_URL, raw: data });
}
