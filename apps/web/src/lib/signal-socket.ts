"use client";

import { useEffect, useRef, useCallback } from "react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL ?? "";

type PricePayload     = { price: number; change: number };
type MemePayload      = { signals: unknown[] };
type XSignalsPayload  = { signals: unknown[] };

type Handlers = {
  onPrice?:     (p: PricePayload)    => void;
  onMeme?:      (p: MemePayload)     => void;
  onXSignals?:  (p: XSignalsPayload) => void;
};

export function useSignalSocket(handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const socketRef  = useRef<WebSocket | null>(null);
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef   = useRef(true);

  const connect = useCallback(() => {
    if (!SOCKET_URL || !aliveRef.current) return;

    // Phoenix socket URL: ws(s)://host/socket/websocket
    const wsUrl = SOCKET_URL.replace(/^http/, "ws") + "/socket/websocket?vsn=2.0.0";

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      // Join signals:lobby channel
      ws.send(JSON.stringify([null, "1", "signals:lobby", "phx_join", {}]));
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      try {
        const [, , , event, payload] = JSON.parse(evt.data) as [unknown, unknown, unknown, string, unknown];

        if (event === "price")       handlersRef.current.onPrice?.(payload as PricePayload);
        if (event === "meme_signals") handlersRef.current.onMeme?.(payload as MemePayload);
        if (event === "x_signals")   handlersRef.current.onXSignals?.(payload as XSignalsPayload);
      } catch {/* ignore malformed frames */}
    };

    ws.onclose = () => {
      if (aliveRef.current) {
        retryRef.current = setTimeout(connect, 5_000);
      }
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    if (!SOCKET_URL) return;

    aliveRef.current = true;
    connect();

    return () => {
      aliveRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      socketRef.current?.close();
    };
  }, [connect]);
}
