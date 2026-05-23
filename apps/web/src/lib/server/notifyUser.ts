import "server-only";
import { redis } from "./redis";
import { sendTelegramAlert, type TelegramAlertOpts } from "./telegram";

interface TgChatRecord {
  chatId: string;
  connectedAt: number;
}

/**
 * Send a notification to the user identified by their wallet address.
 * Looks up the Telegram chat ID stored in Redis and sends a formatted alert.
 * Silent on all errors — callers do not need to handle failures.
 */
export async function notifyUser(
  wallet: string,
  opts: TelegramAlertOpts,
): Promise<void> {
  try {
    const record = await redis.get<TgChatRecord>(`tg:chat:${wallet}`);
    if (!record?.chatId) return;
    await sendTelegramAlert(record.chatId, opts);
  } catch {
    // intentionally silent
  }
}
