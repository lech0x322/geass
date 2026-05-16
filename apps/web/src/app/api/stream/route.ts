import { enrichedTransactions } from "@/lib/server/helius";
import { fetchTokenPair } from "@/lib/server/dexscreener";
import { enrichGem } from "@/lib/server/enrich";
import { buildGem } from "@/lib/scoring";
import { HELIUS_KEY, PUMP_PROG, SCORE_MIN_HELIUS, SKIP_MINTS } from "@/lib/env";
import { detectKolBuyersFromTransfers } from "@/lib/server/kol";
import type { Gem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby max = 60s; upgrade to Pro for 300s
export const maxDuration = 60;

const HEARTBEAT_MS = 15_000;
const DEX_RETRY_MS = 4_000;

async function processSignature(signature: string): Promise<Gem[]> {
  let txs: Awaited<ReturnType<typeof enrichedTransactions>>;
  try {
    txs = await enrichedTransactions([signature]);
  } catch {
    return [];
  }
  if (!txs.length) return [];

  const tx = txs[0];
  const mints = new Set<string>();
  for (const t of tx.tokenTransfers ?? []) {
    if (t.mint && !SKIP_MINTS.has(t.mint)) mints.add(t.mint);
  }
  if (!mints.size) return [];

  const gems: Gem[] = [];
  for (const mint of mints) {
    let pair = await fetchTokenPair(mint);
    if (!pair) {
      await new Promise((r) => setTimeout(r, DEX_RETRY_MS));
      pair = await fetchTokenPair(mint);
    }
    if (!pair) continue;
    const g = buildGem(mint, pair, "stream");
    if (!g || g.score < SCORE_MIN_HELIUS) continue;

    // Detect KOL buyers from this transaction immediately (no extra API call)
    const kolBuyers = detectKolBuyersFromTransfers(tx.tokenTransfers ?? [], mint);
    if (kolBuyers.length) {
      g.kolBuyers = kolBuyers;
      g.kol = kolBuyers.length;
    }

    try { await enrichGem(g); } catch {/* best-effort */}
    gems.push(g);
  }
  return gems;
}

export async function GET(request: Request) {
  if (!HELIUS_KEY) {
    return new Response("HELIUS_API_KEY not configured", { status: 503 });
  }

  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const pending = new Set<string>();
      const seenSigs = new Set<string>();
      let nextReqId = 1;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch { closed = true; }
      };

      // Fresh WebSocket per SSE connection — avoids globalThis singleton
      // that dies between Vercel cold starts.
      const ws = new WebSocket(`wss://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`);

      const heartbeat = setInterval(() => {
        send("ping", { ts: Date.now(), wsState: ws.readyState });
      }, HEARTBEAT_MS);

      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: nextReqId++,
          method: "logsSubscribe",
          params: [{ mentions: [PUMP_PROG] }, { commitment: "processed" }],
        }));
        send("ready", { ts: Date.now(), connected: true });
      });

      ws.addEventListener("message", (ev: MessageEvent) => {
        if (closed) return;
        const raw = typeof ev.data === "string" ? ev.data : "";
        if (!raw) return;
        let msg: unknown;
        try { msg = JSON.parse(raw); } catch { return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = msg as any;
        if (m.id && typeof m.result === "number") return; // subscription confirm
        if (m.method !== "logsNotification") return;
        const value = m.params?.result?.value;
        if (!value || value.err) return;
        const signature: string = value.signature;
        const logs: string[] = value.logs || [];
        if (!signature || seenSigs.has(signature)) return;
        seenSigs.add(signature);
        if (seenSigs.size > 2000) {
          const arr = [...seenSigs]; seenSigs.clear();
          arr.slice(-1000).forEach((s) => seenSigs.add(s));
        }
        const isCreate = logs.some((l) => /Instruction:\s*Create\b/i.test(l));
        if (!isCreate || pending.has(signature)) return;
        pending.add(signature);
        processSignature(signature)
          .then((gems) => { if (gems.length) send("gems", { gems, ts: Date.now() }); })
          .catch(() => {/* swallow */})
          .finally(() => pending.delete(signature));
      });

      ws.addEventListener("close", () => {
        if (!closed) send("ping", { ts: Date.now(), wsState: 3 });
      });

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        try { ws.close(); } catch {/* */}
        try { controller.close(); } catch {/* */}
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
