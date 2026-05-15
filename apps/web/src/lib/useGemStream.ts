"use client";

import { useEffect, useRef, useState } from "react";
import type { Gem } from "./types";

interface StreamState {
  newGems: Gem[];
  detecting: boolean;
  connected: boolean;
  lastEventAt: number | null;
  error: string | null;
}

export function useGemStream(enabled: boolean): StreamState & { clear: () => void } {
  const [state, setState] = useState<StreamState>({
    newGems: [],
    detecting: false,
    connected: false,
    lastEventAt: null,
    error: null,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const es = new EventSource("/api/stream");
    esRef.current = es;

    es.addEventListener("ready", () => {
      setState(s => ({ ...s, connected: true, error: null }));
    });

    es.addEventListener("ping", () => {
      setState(s => ({ ...s, lastEventAt: Date.now(), detecting: false }));
    });

    es.addEventListener("gems", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as { gems: Gem[]; ts: number };
        setState(s => ({
          ...s,
          newGems: [...data.gems, ...s.newGems].slice(0, 50),
          detecting: true,
          lastEventAt: data.ts,
        }));
        setTimeout(() => setState(s => ({ ...s, detecting: false })), 1500);
      } catch {}
    });

    es.addEventListener("error", () => {
      setState(s => ({ ...s, connected: false, error: "stream disconnected" }));
    });

    es.onerror = () => {
      setState(s => ({ ...s, connected: false }));
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [enabled]);

  const clear = () => setState(s => ({ ...s, newGems: [] }));
  return { ...state, clear };
}
