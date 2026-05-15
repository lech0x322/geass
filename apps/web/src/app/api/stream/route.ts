import { pumpTick } from "@/lib/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERVAL_MS = 8_000;

export async function GET() {
  const encoder = new TextEncoder();
  let lastSig: string | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send("ready", { ts: Date.now() });

      while (!closed) {
        try {
          const { newGems, lastSignature } = await pumpTick(lastSig);
          lastSig = lastSignature;
          if (newGems.length) {
            send("gems", { gems: newGems, ts: Date.now() });
          } else {
            send("ping", { ts: Date.now() });
          }
        } catch (e) {
          send("error", { message: e instanceof Error ? e.message : String(e) });
        }
        await new Promise(r => setTimeout(r, INTERVAL_MS));
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
