"use client";

import { useState, useEffect, useCallback } from "react";

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
