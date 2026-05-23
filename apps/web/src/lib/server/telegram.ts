import "server-only";
import { TELEGRAM_BOT_TOKEN } from "../env";

const TG_API = "https://api.telegram.org";

/**
 * Escape special characters for Telegram MarkdownV2 format.
 * Characters that must be escaped: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
function escapeMdV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

/**
 * Send a raw Telegram message to a chat.
 * Uses MarkdownV2 parse_mode.
 * Returns false on failure — never throws.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN is not set — skipping send");
    return false;
  }

  try {
    const res = await fetch(`${TG_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[telegram] sendMessage failed ${res.status}: ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[telegram] sendMessage error:", err);
    return false;
  }
}

export interface TelegramAlertOpts {
  title: string;
  body: string;
  emoji?: string;
}

/**
 * Format and send a structured alert message.
 * Returns false on failure — never throws.
 */
export async function sendTelegramAlert(chatId: string, opts: TelegramAlertOpts): Promise<boolean> {
  const { title, body, emoji = "🔔" } = opts;
  const safeTitle = escapeMdV2(title);
  const safeBody  = escapeMdV2(body);
  const safeEmoji = escapeMdV2(emoji);

  const text = `${safeEmoji} *${safeTitle}*\n\n${safeBody}`;
  return sendTelegramMessage(chatId, text);
}
