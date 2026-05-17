"use client";
import { useEffect, useRef, useState } from "react";
import { fetchDexBatch, type DexTokenInfo } from "./api";

const REFRESH_MS = 15_000;

export function useDexPrices(mints: string[]): Record<string, DexTokenInfo> {
  const [prices, setPrices] = useState<Record<string, DexTokenInfo>>({});
  const mintsRef = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mintsRef.current = mints;
  }, [mints]);

  useEffect(() => {
    const load = async () => {
      const m = mintsRef.current;
      if (!m.length) return;
      try {
        const data = await fetchDexBatch(m);
        setPrices(prev => ({ ...prev, ...data }));
      } catch {}
    };

    load();
    timer.current = setInterval(load, REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return prices;
}
