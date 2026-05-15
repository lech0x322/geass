"use client";

import { useEffect, useState } from "react";
import type { Gem } from "./types";

interface StreamState {
  newGems: Gem[];
  detecting: boolean;
  connected: boolean;
  reconnecting: boolean;
  attempt: number;
  nextRetryAt: number | null;
  lastEventAt: number | null;
  error: string | null;
}

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;
// Server emits a ping every 15s. Allow two misses + a small grace period.
const STALE_THRESHOLD_MS = 35_000;
const WATCHDOG_INTERVAL_MS = 4_000;
const DETECTING_FLASH_MS = 1_500;

export function useGemStream(enabled: boolean): StreamState & { clear: () => void } {
  const [state, setState] = useState<StreamState>({
    newGems: [],
    detecting: false,
    connected: false,
    reconnecting: false,
    attempt: 0,
    nextRetryAt: null,
    lastEventAt: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdog: ReturnType<typeof setInterval> | null = null;
    let detectingTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = INITIAL_BACKOFF_MS;
    let lastEventAt = 0;
    let attempt = 0;
    let closed = false;

    const clearRetry = () => {
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    };
    const clearConnect = () => {
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
    };

    const scheduleReconnect = (reason: string) => {
      if (closed) return;
      if (retryTimer) return;
      attempt += 1;
      const jitter = Math.random() * 500;
      const delay = Math.min(MAX_BACKOFF_MS, backoff) + jitter;
      backoff = Math.min(MAX_BACKOFF_MS, backoff * 2);
      const nextRetryAt = Date.now() + delay;
      setState(s => ({
        ...s,
        connected: false,
        reconnecting: true,
        attempt,
        nextRetryAt,
        error: reason,
      }));
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    const teardownEs = () => {
      clearConnect();
      if (es) { es.close(); es = null; }
    };

    function connect() {
      if (closed) return;
      teardownEs();

      es = new EventSource("/api/stream");

      // If we never receive `ready` within the timeout, treat as failed.
      connectTimer = setTimeout(() => {
        connectTimer = null;
        if (closed) return;
        teardownEs();
        scheduleReconnect("connect timeout");
      }, CONNECT_TIMEOUT_MS);

      es.addEventListener("ready", () => {
        clearConnect();
        lastEventAt = Date.now();
        backoff = INITIAL_BACKOFF_MS;
        attempt = 0;
        setState(s => ({
          ...s,
          connected: true,
          reconnecting: false,
          attempt: 0,
          nextRetryAt: null,
          error: null,
          lastEventAt,
        }));
      });

      es.addEventListener("ping", () => {
        lastEventAt = Date.now();
        setState(s => ({ ...s, lastEventAt, detecting: false }));
      });

      es.addEventListener("gems", (ev) => {
        lastEventAt = Date.now();
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { gems: Gem[]; ts: number };
          setState(s => ({
            ...s,
            newGems: [...data.gems, ...s.newGems].slice(0, 50),
            detecting: true,
            lastEventAt: data.ts,
          }));
          if (detectingTimer) clearTimeout(detectingTimer);
          detectingTimer = setTimeout(() => {
            setState(s => ({ ...s, detecting: false }));
          }, DETECTING_FLASH_MS);
        } catch {
          // ignore malformed payloads
        }
      });

      es.addEventListener("error", () => {
        // Browser would auto-retry on its own schedule; we want our backoff.
        if (closed) return;
        teardownEs();
        scheduleReconnect("network");
      });
    }

    connect();

    watchdog = setInterval(() => {
      if (closed || !lastEventAt) return;
      if (Date.now() - lastEventAt > STALE_THRESHOLD_MS) {
        teardownEs();
        scheduleReconnect("stale");
      }
    }, WATCHDOG_INTERVAL_MS);

    return () => {
      closed = true;
      clearRetry();
      clearConnect();
      if (watchdog) clearInterval(watchdog);
      if (detectingTimer) clearTimeout(detectingTimer);
      teardownEs();
    };
  }, [enabled]);

  return {
    ...state,
    clear: () => setState(s => ({ ...s, newGems: [] })),
  };
}
