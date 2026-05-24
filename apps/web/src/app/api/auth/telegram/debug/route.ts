import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TELEGRAM_BOT_TOKEN, APP_BASE_URL } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const r: Record<string, unknown> = {};

  r.tokenSet   = !!TELEGRAM_BOT_TOKEN;
  r.appBaseUrl = APP_BASE_URL;
  r.webhookUrl = `${APP_BASE_URL}/api/auth/telegram/webhook`;

  // Redis round-trip
  try {
    await redis.set("tg:debug:test", "ok", 30);
    const val = await redis.get<string>("tg:debug:test");
    r.redis = { ok: val === "ok", got: val };
  } catch (e) {
    r.redis = { ok: false, error: String(e) };
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ...r, error: "TELEGRAM_BOT_TOKEN not set" }, { status: 503 });
  }

  // Bot identity
  try {
    const me = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const d  = await me.json() as { ok: boolean; result?: { username?: string; first_name?: string } };
    r.bot = { ok: d.ok, username: d.result?.username, name: d.result?.first_name };
  } catch (e) {
    r.bot = { ok: false, error: String(e) };
  }

  // Current webhook
  try {
    const wi = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const d  = await wi.json() as {
      ok: boolean;
      result?: { url?: string; last_error_message?: string; pending_update_count?: number };
    };
    const current = d.result?.url ?? "";
    r.webhook = {
      ok:             d.ok,
      current,
      expected:       `${APP_BASE_URL}/api/auth/telegram/webhook`,
      matched:        current === `${APP_BASE_URL}/api/auth/telegram/webhook`,
      lastError:      d.result?.last_error_message ?? null,
      pendingUpdates: d.result?.pending_update_count ?? 0,
    };
  } catch (e) {
    r.webhook = { ok: false, error: String(e) };
  }

  return NextResponse.json(r);
}
