import {
  subscribeKolFeed, getRecentTradesAsync, pollRedisFeed,
} from "@/lib/server/kolFeed";
import { ensureKolWebhook } from "@/lib/server/heliusWebhook";
import { WEBHOOK_BASE_URL, HELIUS_WEBHOOK_AUTH } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Lazily register the KOL webhook if not yet done
  ensureKolWebhook(WEBHOOK_BASE_URL, HELIUS_WEBHOOK_AUTH).catch(() => {});

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {}
      };

      // Track which trade ids we've already pushed so the Redis poll loop
      // only emits genuinely new trades (those produced on other instances).
      const sentIds = new Set<string>();

      // Send recent trades immediately on connect (cross-instance via Redis).
      const recent = await getRecentTradesAsync();
      if (recent.length) {
        for (const t of recent) sentIds.add(t.id);
        send({ type: "recent", trades: recent });
      }

      // Instant same-instance delivery.
      const unsub = subscribeKolFeed(trade => {
        if (sentIds.has(trade.id)) return;
        sentIds.add(trade.id);
        send({ type: "trade", trade });
      });

      // Cross-instance delivery: webhook POSTs may land on a different lambda,
      // so poll the durable Redis feed and emit any trade we haven't sent yet.
      const poll = setInterval(async () => {
        const trades = await pollRedisFeed();
        // Redis returns newest-first; emit oldest-first so order is natural.
        for (const t of trades.reverse()) {
          if (!t?.id || sentIds.has(t.id)) continue;
          sentIds.add(t.id);
          send({ type: "trade", trade: t });
        }
        // Cap memory of the dedupe set on long-lived connections.
        if (sentIds.size > 1000) sentIds.clear();
      }, 4_000);

      const ping = setInterval(() => send({ type: "ping" }), 15_000);

      const timeout = setTimeout(() => {
        clearInterval(ping);
        clearInterval(poll);
        unsub();
        try { controller.close(); } catch {}
      }, 4 * 60_000);

      return () => {
        clearInterval(ping);
        clearInterval(poll);
        clearTimeout(timeout);
        unsub();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
