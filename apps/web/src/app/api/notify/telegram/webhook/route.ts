import { NextResponse } from "next/server";
import { TELEGRAM_BOT_TOKEN } from "@/lib/env";
import { sendTelegramMessage } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
}

export async function POST(request: Request) {
  // Optional secret header validation (set TELEGRAM_WEBHOOK_SECRET in env)
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const msg = update.message;
  if (!msg || !TELEGRAM_BOT_TOKEN) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const text   = msg.text?.trim() ?? "";
  const name   = msg.from?.first_name ?? "trader";

  // Escape special chars for MarkdownV2
  const escapedName   = name.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
  const escapedChatId = chatId.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);

  // 6-digit OTP → login verification
  if (/^\d{6}$/.test(text)) {
    const { redis } = await import("@/lib/server/redis");
    const stored = await redis.get<{ verified: boolean; chatId: string | null }>(`tg:otp:${text}`);
    if (stored && !stored.verified) {
      await redis.set(`tg:otp:${text}`, { verified: true, chatId }, 300);
      await sendTelegramMessage(
        chatId,
        `✅ *Cod confirmat\\!*\n\nRevino în GEASS — sesiunea ta se activează automat\\.`,
      );
      return NextResponse.json({ ok: true });
    }
  }

  if (text === "/start" || text.startsWith("/start ")) {
    await sendTelegramMessage(
      chatId,
      `👋 *Bun venit în GEASS, ${escapedName}\\!*\n\n` +
      `Chat ID\\-ul tău este:\n\n` +
      `\`${escapedChatId}\`\n\n` +
      `Copiază acest număr și lipește\\-l în *GEASS → Settings → Notifications* pentru a activa alertele\\.`,
    );
  } else if (text === "/id") {
    await sendTelegramMessage(chatId, `Your Chat ID: \`${escapedChatId}\``);
  } else if (text === "/help") {
    await sendTelegramMessage(
      chatId,
      `*GEASS Alert Bot*\n\n` +
      `/start \\- Obține Chat ID\\-ul tău\n` +
      `/id \\- Afișează din nou Chat ID\\-ul\n\n` +
      `Odată conectat în GEASS, vei primi alerte pentru TP/SL, mișcări smart\\-money și lansări noi\\.`,
    );
  }

  return NextResponse.json({ ok: true });
}
