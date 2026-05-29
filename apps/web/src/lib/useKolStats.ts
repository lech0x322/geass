"use client";

import { useState, useEffect } from "react";

export interface KolStat {
  addr:      string;
  swaps30d:  number;
  netSol30d: number;
  ok:        boolean;
}

/**
 * Fetches real 30-day on-chain activity (swap count + net SOL flow) for the
 * given wallet addresses from /api/kol/stats. Returns a map keyed by address.
 */
export function useKolStats(addrs: readonly string[]) {
  const [stats, setStats] = useState<Record<string, KolStat>>({});
  const [loading, setLoading] = useState(true);
  const key = addrs.join(",");

  useEffect(() => {
    if (!key) { setStats({}); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    fetch(`/api/kol/stats?addrs=${encodeURIComponent(key)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((data: { stats?: KolStat[] }) => {
        if (cancelled) return;
        const map: Record<string, KolStat> = {};
        for (const s of data.stats ?? []) map[s.addr] = s;
        setStats(map);
      })
      .catch(() => { if (!cancelled) setStats({}); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [key]);

  return { stats, loading };
}
