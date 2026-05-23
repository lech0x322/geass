import "server-only";
import { redis } from "./redis";
import { sendTelegramAlert, type TelegramAlertOpts } from "./telegram";

export async function notifyUser(
  wallet: string,
  opts: TelegramAlertOpts,
): Promise<void> {
  try {
    const chatId = await redis.get<string>(`tg:chat:${wallet}`);
    if (!chatId) return;
    await sendTelegramAlert(chatId, opts);
  } catch {
    // intentionally silent
  }
}
