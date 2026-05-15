import "server-only";
import { EventEmitter } from "node:events";
import { HELIUS_KEY, PUMP_PROG } from "../env";

export interface CreateEvent {
  signature: string;
  ts: number;
}

export interface WsStatus {
  connected: boolean;
  since: number | null;
  subscriptionId: number | null;
  reconnects: number;
  seenSignatures: number;
  lastEventAt: number | null;
}

class HeliusWsManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptionId: number | null = null;
  private connectedSince: number | null = null;
  private reconnects = 0;
  private nextRequestId = 1;
  private seenSigs = new Set<string>();
  private lastEventAt: number | null = null;
  private backoffMs = 1_000;

  start() {
    if (this.ws || !HELIUS_KEY) return;
    this.setMaxListeners(64);
    this.connect();
  }

  status(): WsStatus {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      since: this.connectedSince,
      subscriptionId: this.subscriptionId,
      reconnects: this.reconnects,
      seenSignatures: this.seenSigs.size,
      lastEventAt: this.lastEventAt,
    };
  }

  private connect() {
    if (!HELIUS_KEY) return;
    const url = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.warn("[helius-ws] ctor failed:", e);
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      this.connectedSince = Date.now();
      this.backoffMs = 1_000;
      console.log("[helius-ws] connected");
      this.subscribe();
    });

    this.ws.addEventListener("message", (ev) => {
      const raw = typeof ev.data === "string" ? ev.data : "";
      if (raw) this.handleMessage(raw);
    });

    this.ws.addEventListener("close", () => {
      const wasConnected = this.connectedSince !== null;
      this.cleanup();
      if (wasConnected) console.warn("[helius-ws] closed, reconnecting");
      this.scheduleReconnect();
    });

    this.ws.addEventListener("error", (ev) => {
      // The "error" event from native WebSocket is opaque; rely on "close"
      // for retries. Just log a marker.
      const msg = (ev as Event & { message?: string }).message;
      if (msg) console.warn("[helius-ws] error:", msg);
    });
  }

  private subscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = {
      jsonrpc: "2.0",
      id: this.nextRequestId++,
      method: "logsSubscribe",
      params: [
        { mentions: [PUMP_PROG] },
        { commitment: "processed" },
      ],
    };
    this.ws.send(JSON.stringify(msg));
  }

  private handleMessage(raw: string) {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = msg as any;

    // Subscription confirmation
    if (m.id && typeof m.result === "number") {
      this.subscriptionId = m.result;
      return;
    }

    // Notification
    if (m.method === "logsNotification") {
      const value = m.params?.result?.value;
      if (!value) return;
      const signature: string | undefined = value.signature;
      const logs: string[] | undefined = value.logs;
      const err = value.err;
      if (!signature || err) return;
      if (this.seenSigs.has(signature)) return;
      this.seenSigs.add(signature);
      if (this.seenSigs.size > 2000) {
        const arr = [...this.seenSigs];
        this.seenSigs = new Set(arr.slice(-1000));
      }
      this.lastEventAt = Date.now();

      const isCreate = Array.isArray(logs) && logs.some(
        (l) => typeof l === "string" && /Instruction:\s*Create\b/i.test(l),
      );
      if (isCreate) {
        const evt: CreateEvent = { signature, ts: this.lastEventAt };
        this.emit("create", evt);
      }
    }
  }

  private cleanup() {
    this.ws = null;
    this.subscriptionId = null;
    this.connectedSince = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnects += 1;
    const delay = Math.min(30_000, this.backoffMs);
    this.backoffMs = Math.min(30_000, this.backoffMs * 2);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __geassHeliusWs: HeliusWsManager | undefined;
}

export function getHeliusWs(): HeliusWsManager {
  if (!globalThis.__geassHeliusWs) {
    const mgr = new HeliusWsManager();
    globalThis.__geassHeliusWs = mgr;
    mgr.start();
  }
  return globalThis.__geassHeliusWs;
}
