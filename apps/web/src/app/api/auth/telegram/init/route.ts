import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TELEGRAM_BOT_TOKEN, APP_BASE_URL } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function webhookUrl() {
  return `${APP_BASE_URL}/api/auth/telegram/webhook`;
}

async function registerWebhook(): Promise<{ ok: boolean; alreadySet?: boolean; description?: string }> {
  const WEBHOOK_URL = webhookUrl();
  try {
    const info = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const { result } = await info.json() as { result?: { url?: string } };
    if (result?.url === WEBHOOK_URL) return { ok: true, alreadySet: true };

    const setRes  = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url: WEBHOOK_URL, allowed_updates: ["message"] }),
    });
    const setData = await setRes.json() as { ok: boolean; description?: string };
    if (!setData.ok) console.error("[tg] setWebhook failed:", setData.description);
    return { ok: setData.ok, description: setData.description };
  } catch (e) {
    console.error("[tg] registerWebhook error:", e);
    return { ok: false, description: String(e) };
  }
}

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  console.log("[tg] init: APP_BASE_URL =", APP_BASE_URL, "| webhookUrl =", webhookUrl());

  const webhook = await registerWebhook();
  console.log("[tg] init: webhook result:", JSON.stringify(webhook));

  const code = randomCode();
  await redis.set(`tg:otp:${code}`, "pending", 300);

  return NextResponse.json({ code });
}
