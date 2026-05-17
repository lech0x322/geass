"use client";
import { useEffect, useRef, useState } from "react";
import type { FeedTrade } from "./types";

export function useKolFeed(): FeedTrade[] {
  const [trades, setTrades] = useState<FeedTrade[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const es = new EventSource("/api/feed/stream");
      esRef.current = es;

      es.onmessage = e => {
        try {
          const msg = JSON.parse(e.data as string);
          const now = Date.now();
          if (msg.type === "recent") {
            const stamped: FeedTrade[] = (msg.trades as FeedTrade[]).map(t => ({
              ...t,
              ago: t.ts ? Math.floor((now - t.ts) / 1000) : t.ago,
            }));
            setTrades(stamped.slice(0, 40));
          } else if (msg.type === "trade") {
            const t = msg.trade as FeedTrade;
            setTrades(prev => [{ ...t, ago: 0 }, ...prev].slice(0, 40));
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        if (!cancelled) {
          retryTimer.current = setTimeout(connect, 5_000);
        }
      };
    };

    connect();

    // Tick ago counters every 30s
    const tick = setInterval(() => {
      setTrades(prev => prev.map(t => ({
        ...t,
        ago: t.ts ? Math.floor((Date.now() - t.ts) / 1000) : t.ago + 30,
      })));
    }, 30_000);

    return () => {
      cancelled = true;
      esRef.current?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
      clearInterval(tick);
    };
  }, []);

  return trades;
}
