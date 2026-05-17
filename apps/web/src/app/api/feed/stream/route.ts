import { subscribeKolFeed, getRecentTrades } from "@/lib/server/kolFeed";
import { ensureKolWebhook } from "@/lib/server/heliusWebhook";
import { WEBHOOK_BASE_URL, HELIUS_WEBHOOK_AUTH } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Lazily register the KOL webhook if not yet done
  ensureKolWebhook(WEBHOOK_BASE_URL, HELIUS_WEBHOOK_AUTH).catch(() => {});

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {}
      };

      // Send recent trades immediately on connect
      const recent = getRecentTrades();
      if (recent.length) send({ type: "recent", trades: recent });

      const unsub = subscribeKolFeed(trade => send({ type: "trade", trade }));

      const ping = setInterval(() => send({ type: "ping" }), 15_000);

      const timeout = setTimeout(() => {
        clearInterval(ping);
        unsub();
        try { controller.close(); } catch {}
      }, 4 * 60_000);

      return () => {
        clearInterval(ping);
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
