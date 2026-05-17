import { NextRequest } from "next/server";
import { subscribe } from "@/lib/server/proEvents";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE endpoint: a client subscribes per-wallet and receives a `payment` event
// the moment the Helius webhook reports a matching transfer to the treasury.
// Auto-closes after 4 minutes (covers Vercel's Pro function timeout).
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { bucket: "pro_listen", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || wallet.length < 32) {
    return new Response("wallet required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (s: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(s)); } catch { closed = true; }
      };

      send(`event: ready\ndata: {}\n\n`);

      const unsubscribe = subscribe(wallet, (event) => {
        send(`event: payment\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const ping = setInterval(() => send(`: ping\n\n`), 15_000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        clearTimeout(timeout);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

      const timeout = setTimeout(close, 4 * 60 * 1000);
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
