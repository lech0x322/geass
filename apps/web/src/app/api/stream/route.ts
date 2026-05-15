import { getHeliusWs, type CreateEvent } from "@/lib/server/heliusWs";
import { enrichedTransactions } from "@/lib/server/helius";
import { fetchTokenPair } from "@/lib/server/dexscreener";
import { enrichGem } from "@/lib/server/enrich";
import { buildGem } from "@/lib/scoring";
import { SCORE_MIN_HELIUS, SKIP_MINTS } from "@/lib/env";
import type { Gem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
const DEX_RETRY_DELAY_MS = 4_000;

async function mintsFromSignature(signature: string): Promise<string[]> {
  try {
    const txs = await enrichedTransactions([signature]);
    if (!txs.length) return [];
    const mints = new Set<string>();
    for (const t of txs[0].tokenTransfers ?? []) {
      if (t.mint && !SKIP_MINTS.has(t.mint)) mints.add(t.mint);
    }
    return [...mints];
  } catch {
    return [];
  }
}

async function gemForMint(mint: string): Promise<Gem | null> {
  let pair = await fetchTokenPair(mint);
  if (!pair) {
    await new Promise((r) => setTimeout(r, DEX_RETRY_DELAY_MS));
    pair = await fetchTokenPair(mint);
  }
  if (!pair) return null;
  const g = buildGem(mint, pair, "stream");
  if (!g || g.score < SCORE_MIN_HELIUS) return null;
  try {
    await enrichGem(g);
  } catch {
    // Enrichment is best-effort; emit the gem either way.
  }
  return g;
}

export async function GET(request: Request) {
  const ws = getHeliusWs();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const pending = new Set<string>();

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      send("ready", { ...ws.status(), ts: Date.now() });

      const heartbeat = setInterval(() => {
        send("ping", { ts: Date.now(), ...ws.status() });
      }, HEARTBEAT_MS);

      const onCreate = async (evt: CreateEvent) => {
        if (closed) return;
        if (pending.has(evt.signature)) return;
        pending.add(evt.signature);
        try {
          const mints = await mintsFromSignature(evt.signature);
          for (const mint of mints) {
            if (closed) break;
            const gem = await gemForMint(mint);
            if (gem) send("gems", { gems: [gem], ts: Date.now() });
          }
        } finally {
          pending.delete(evt.signature);
        }
      };

      ws.on("create", onCreate);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        ws.off("create", onCreate);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },

    cancel() {
      // The closure-scoped cleanup is also bound to request.signal abort,
      // so this is mostly defensive.
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
