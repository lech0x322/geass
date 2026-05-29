"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { pushNotification } from "./useNotifications";

export interface WatchlistEntry {
  mint: string;
  sym: string;
  name: string;
  addedAt: number;
  alertPrice?: number;
}

const KEY = "geass:watchlist:v1";

function load(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

function save(entries: WatchlistEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);

  useEffect(() => { setEntries(load()); }, []);

  const add = useCallback((entry: Omit<WatchlistEntry, "addedAt">) => {
    setEntries(prev => {
      if (prev.some(e => e.mint === entry.mint)) return prev;
      const next = [{ ...entry, addedAt: Date.now() }, ...prev];
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((mint: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.mint !== mint);
      save(next);
      return next;
    });
  }, []);

  const has = useCallback((mint: string) => entries.some(e => e.mint === mint), [entries]);

  const setAlert = useCallback((mint: string, price: number | undefined) => {
    setEntries(prev => {
      const next = prev.map(e => e.mint === mint ? { ...e, alertPrice: price } : e);
      save(next);
      return next;
    });
  }, []);

  return { entries, add, remove, has, setAlert };
}

// ─── Live price data for watched tokens ───────────────────────────────────────

export interface WatchlistLiveData {
  priceUsd?:    number;
  priceChange?: number; // 24h %
  marketCap?:   number;
  liquidity?:   number;
  volume24h?:   number;
  loading:      boolean;
}

const POLL_MS = 30_000;

/**
 * Polls live Dexscreener data for each watched mint and fires a one-shot
 * notification when an entry's price crosses its configured alert level.
 * Returns a map keyed by mint.
 */
export function useWatchlistLive(entries: WatchlistEntry[]) {
  const [data, setData] = useState<Record<string, WatchlistLiveData>>({});
  // Tracks which (mint, alertPrice) pairs have already fired so we don't spam.
  const firedRef = useRef<Set<string>>(new Set());

  // Build a stable dependency from the mints we need to watch.
  const mintKey = entries.map(e => e.mint).join(",");

  useEffect(() => {
    const mints = mintKey ? mintKey.split(",") : [];
    if (mints.length === 0) { setData({}); return; }

    let cancelled = false;

    async function refresh() {
      setData(prev => {
        const next = { ...prev };
        for (const m of mints) if (!next[m]) next[m] = { loading: true };
        return next;
      });

      const results = await Promise.all(mints.map(async mint => {
        try {
          const r = await fetch(`/api/token/${mint}`);
          if (!r.ok) return { mint, live: { loading: false } as WatchlistLiveData };
          const { pair } = await r.json() as { pair: any };
          if (!pair) return { mint, live: { loading: false } as WatchlistLiveData };
          return {
            mint,
            live: {
              priceUsd:    pair.priceUsd ? Number(pair.priceUsd) : undefined,
              priceChange: pair.priceChange?.h24 ?? undefined,
              marketCap:   pair.marketCap ?? pair.fdv ?? undefined,
              liquidity:   pair.liquidity?.usd ?? undefined,
              volume24h:   pair.volume?.h24 ?? undefined,
              loading:     false,
            } as WatchlistLiveData,
          };
        } catch {
          return { mint, live: { loading: false } as WatchlistLiveData };
        }
      }));

      if (cancelled) return;

      setData(prev => {
        const next = { ...prev };
        for (const { mint, live } of results) next[mint] = live;
        return next;
      });

      // Fire price alerts.
      for (const { mint, live } of results) {
        const entry = entries.find(e => e.mint === mint);
        if (!entry || entry.alertPrice === undefined || live.priceUsd === undefined) continue;
        const fireId = `${mint}:${entry.alertPrice}`;
        if (firedRef.current.has(fireId)) continue;
        if (live.priceUsd >= entry.alertPrice) {
          firedRef.current.add(fireId);
          pushNotification({
            kind:     "system",
            severity: "success",
            title:    `${entry.sym} hit your alert`,
            body:     `Price reached $${live.priceUsd} (alert @ $${entry.alertPrice})`,
            href:     `https://dexscreener.com/solana/${mint}`,
            tab:      "watchlist",
            meta:     { mint, alertPrice: entry.alertPrice, price: live.priceUsd },
          });
        }
      }
    }

    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintKey]);

  return data;
}
