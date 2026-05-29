import "server-only";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT  = process.env.TELEGRAM_CHAT_ID   ?? "";

export function telegramEnabled() {
  return Boolean(TOKEN && CHAT);
}

export async function sendTelegram(text: string): Promise<void> {
  if (!telegramEnabled()) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch { /* non-blocking */ }
}

export async function notifyGem(sym: string, mint: string, score: number, tier: string, reasons: string[]) {
  const tierEmoji = tier === "S_TIER" ? "🚀" : tier === "A_TIER" ? "⚡" : "💎";
  await sendTelegram(
    `${tierEmoji} <b>GEASS GEM: $${sym}</b>\n` +
    `Score: <b>${score}</b> | Tier: <b>${tier.replace("_TIER","")}</b>\n` +
    `<code>${mint}</code>\n` +
    (reasons.length ? reasons.slice(0, 3).map(r => `· ${r}`).join("\n") + "\n" : "") +
    `<a href="https://dexscreener.com/solana/${mint}">Chart ↗</a>`
  );
}

export async function notifyKol(kolName: string, sym: string, mint: string, action: "buy" | "sell", amtSol: number) {
  const emoji = action === "buy" ? "🟢" : "🔴";
  await sendTelegram(
    `${emoji} <b>KOL ${action.toUpperCase()}: $${sym}</b>\n` +
    `Trader: <b>${kolName}</b> | ${amtSol.toFixed(3)} SOL\n` +
    `<code>${mint}</code>\n` +
    `<a href="https://dexscreener.com/solana/${mint}">Chart ↗</a>`
  );
}
