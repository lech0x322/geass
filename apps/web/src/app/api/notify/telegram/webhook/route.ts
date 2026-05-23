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

function esc(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
}

export async function POST(request: Request) {
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

  const chatId     = String(msg.chat.id);
  const text       = msg.text?.trim() ?? "";
  const name       = msg.from?.first_name ?? "trader";
  const safeName   = esc(name);
  const safeChatId = esc(chatId);

  // 6-digit OTP → Telegram OTP login verification
  if (/^\d{6}$/.test(text)) {
    const { redis } = await import("@/lib/server/redis");
    const stored = await redis.get<{ verified: boolean; chatId: string | null }>(`tg:otp:${text}`);
    if (stored && !stored.verified) {
      await redis.set(`tg:otp:${text}`, { verified: true, chatId }, 300);
      await sendTelegramMessage(
        chatId,
        `✅ *Code confirmed\\!*\n\nReturn to GEASS — your session will activate automatically\\.`,
      );
      return NextResponse.json({ ok: true });
    }
    await sendTelegramMessage(chatId, `❌ Invalid or expired code\\. Generate a new one on GEASS\\.`);
    return NextResponse.json({ ok: true });
  }

  const cmd = text.split(" ")[0].toLowerCase();

  if (cmd === "/start") {
    await sendTelegramMessage(
      chatId,
      `👋 *Welcome to GEASS, ${safeName}\\!*\n\n` +
      `Your Chat ID is:\n\n` +
      `\`${safeChatId}\`\n\n` +
      `*Connect alerts:* GEASS → Settings → Notifications → paste this ID\n\n` +
      `*Log in via Telegram:* Click *Enter GEASS* on [geass\\.app](https://geass.app) → choose Telegram → send the 6\\-digit code here\\.\n\n` +
      `Type /help to see all commands\\.`,
    );

  } else if (cmd === "/id") {
    await sendTelegramMessage(chatId, `🆔 Your Chat ID: \`${safeChatId}\``);

  } else if (cmd === "/status") {
    const { redis } = await import("@/lib/server/redis");
    const wallet = await redis.get<string>(`tg:wallet:${chatId}`);
    if (!wallet) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *Not connected*\n\nLink your wallet in GEASS → Settings → Notifications\\.`,
      );
    } else {
      const proData = await redis.get<{ expiresAt: number }>(`pro:${wallet}`);
      const isPro   = proData && (proData.expiresAt === 0 || proData.expiresAt > Date.now());
      const shortW  = esc(`${wallet.slice(0, 6)}…${wallet.slice(-4)}`);
      await sendTelegramMessage(
        chatId,
        `📊 *GEASS Status*\n\n` +
        `Wallet: \`${shortW}\`\n` +
        `Plan: ${isPro ? "🟣 *Pro*" : "⚪ Free"}\n` +
        `Alerts: ✅ Active\n\n` +
        `You will receive TP/SL hits, snipe confirmations, and whale alerts here\\.`,
      );
    }

  } else if (cmd === "/alerts") {
    const { redis } = await import("@/lib/server/redis");
    const wallet = await redis.get<string>(`tg:wallet:${chatId}`);
    if (!wallet) {
      await sendTelegramMessage(chatId, `⚠️ Connect your wallet first: GEASS → Settings → Notifications\\.`);
    } else {
      const rules = await redis.get<{ mint: string; tp?: number; sl?: number }[]>(`tpsl:${wallet}`) ?? [];
      if (!rules.length) {
        await sendTelegramMessage(chatId, `📭 *No active TP/SL alerts*\n\nSet them up inside GEASS after sniping a token\\.`);
      } else {
        const lines = rules
          .slice(0, 10)
          .map((r, i) => {
            const mintShort = esc(`${r.mint.slice(0, 6)}…`);
            const tp = r.tp != null ? `TP \\+${r.tp}%` : "";
            const sl = r.sl != null ? `SL \\-${r.sl}%` : "";
            return `${i + 1}\\. \`${mintShort}\` — ${[tp, sl].filter(Boolean).join(" / ")}`;
          })
          .join("\n");
        await sendTelegramMessage(chatId, `🎯 *Active TP/SL alerts \\(${rules.length}\\)*\n\n${lines}`);
      }
    }

  } else if (cmd === "/pnl") {
    const { redis } = await import("@/lib/server/redis");
    const wallet = await redis.get<string>(`tg:wallet:${chatId}`);
    if (!wallet) {
      await sendTelegramMessage(chatId, `⚠️ Connect your wallet first: GEASS → Settings → Notifications\\.`);
    } else {
      const trades = await redis.get<{ mint: string; pnlSol?: number }[]>(`trades:${wallet}`) ?? [];
      if (!trades.length) {
        await sendTelegramMessage(chatId, `📭 *No trades recorded yet*\n\nTrades you execute in GEASS appear here\\.`);
      } else {
        const total   = trades.reduce((s, t) => s + (t.pnlSol ?? 0), 0);
        const sign    = total >= 0 ? "\\+" : "\\-";
        const safeTot = esc(Math.abs(total).toFixed(3));
        await sendTelegramMessage(
          chatId,
          `💰 *PnL Summary*\n\n` +
          `Trades: ${esc(String(trades.length))}\n` +
          `Realized PnL: ${sign}${safeTot} SOL\n\n` +
          `_Full breakdown in GEASS → Trades tab_`,
        );
      }
    }

  } else if (cmd === "/disconnect") {
    const { redis } = await import("@/lib/server/redis");
    const wallet = await redis.get<string>(`tg:wallet:${chatId}`);
    if (!wallet) {
      await sendTelegramMessage(chatId, `ℹ️ No wallet connected to this chat\\.`);
    } else {
      await redis.del(`tg:wallet:${chatId}`);
      await redis.del(`tg:chat:${wallet}`);
      await sendTelegramMessage(
        chatId,
        `✅ *Disconnected*\n\nAlerts disabled\\. Reconnect anytime in GEASS → Settings → Notifications\\.`,
      );
    }

  } else if (cmd === "/help") {
    await sendTelegramMessage(
      chatId,
      `*GEASS Alert Bot — Commands*\n\n` +
      `/start \\— Welcome message \\+ your Chat ID\n` +
      `/id \\— Show your Chat ID\n` +
      `/status \\— Wallet connection \\+ Pro status\n` +
      `/alerts \\— View active TP/SL alert rules\n` +
      `/pnl \\— Realized PnL summary\n` +
      `/disconnect \\— Unlink wallet from this chat\n` +
      `/help \\— Show this message\n\n` +
      `*How to connect:*\n` +
      `1\\. Open [geass\\.app](https://geass.app)\n` +
      `2\\. Login → Settings → Notifications\n` +
      `3\\. Paste your Chat ID \\(\`${safeChatId}\`\\)\n\n` +
      `_You'll receive TP/SL hits, snipe confirmations, and whale alerts automatically\\._`,
    );
  }

  return NextResponse.json({ ok: true });
}
