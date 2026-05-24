import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TELEGRAM_BOT_TOKEN } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TgUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
};

async function sendMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(request: Request) {
  let body: TgUpdate;
  try { body = await request.json() as TgUpdate; }
  catch { return NextResponse.json({ ok: true }); }

  const msg = body.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const text   = (msg.text ?? "").trim();

  // 6-digit OTP code — link this chatId to the pending login
  if (/^\d{6}$/.test(text)) {
    const value = await redis.get<string>(`tg:otp:${text}`);
    if (value === "pending") {
      await redis.set(`tg:otp:${text}`, String(chatId), 300);
      await sendMessage(chatId, `✅ <b>Logged in to GEASS!</b>\n\nYour session is now active. Return to the app.`);
    } else if (value === null) {
      await sendMessage(chatId, `⚠️ Code <b>${text}</b> has expired. Request a new code from the GEASS app.`);
    } else {
      await sendMessage(chatId, `ℹ️ This code has already been used.`);
    }
    return NextResponse.json({ ok: true });
  }

  if (text === "/start" || text.startsWith("/start ")) {
    await sendMessage(chatId, `👋 <b>Welcome to GEASS Bot!</b>\n\nTo log in, open the GEASS app, click <b>Login with Telegram</b>, and send the 6-digit code shown.\n\n📊 Once linked you'll receive trade alerts and TP/SL notifications here.`);
    return NextResponse.json({ ok: true });
  }

  if (text === "/status") {
    const wallet = await redis.get<string>(`tg:wallet:${chatId}`);
    if (wallet) {
      await sendMessage(chatId, `✅ <b>Connected</b>\nWallet: <code>${wallet}</code>`);
    } else {
      await sendMessage(chatId, `❌ No wallet linked. Login via the GEASS app first.`);
    }
    return NextResponse.json({ ok: true });
  }

  if (text === "/disconnect") {
    const wallet = await redis.get<string>(`tg:wallet:${chatId}`);
    if (wallet) {
      await redis.set(`tg:wallet:${chatId}`, "", 1);
      await redis.set(`tg:chat:${wallet}`, "", 1);
      await sendMessage(chatId, `✅ Disconnected. You will no longer receive GEASS alerts.`);
    } else {
      await sendMessage(chatId, `ℹ️ No wallet is currently linked.`);
    }
    return NextResponse.json({ ok: true });
  }

  await sendMessage(chatId, `Send your 6-digit GEASS login code, or use /start for help.`);
  return NextResponse.json({ ok: true });
}
