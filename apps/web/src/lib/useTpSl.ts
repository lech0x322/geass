"use client";

import { useState, useEffect, useCallback } from "react";
import type { TpSlRule } from "@/lib/types/tpsl";

export type { TpSlRule };

export function useTpSl(wallet: string | null) {
  const [rules, setRules] = useState<TpSlRule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!wallet) {
      setRules([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/tpsl?wallet=${encodeURIComponent(wallet)}`, {
        cache: "no-store",
      });
      if (!r.ok) {
        setRules([]);
        return;
      }
      const d = await r.json() as { rules?: TpSlRule[] };
      setRules(d.rules ?? []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const addRule = useCallback(
    async (
      partial: Omit<TpSlRule, "id" | "createdAt" | "triggeredAt" | "triggeredType">,
    ): Promise<void> => {
      if (!wallet) return;
      const rule: TpSlRule = {
        ...partial,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        triggeredAt: null,
        triggeredType: null,
      };
      const r = await fetch("/api/tpsl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: "add rule failed" }));
        throw new Error((e as { error?: string }).error ?? "add rule failed");
      }
      await fetchRules();
    },
    [wallet, fetchRules],
  );

  const removeRule = useCallback(
    async (id: string): Promise<void> => {
      if (!wallet) return;
      const r = await fetch(
        `/api/tpsl?id=${encodeURIComponent(id)}&wallet=${encodeURIComponent(wallet)}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: "remove rule failed" }));
        throw new Error((e as { error?: string }).error ?? "remove rule failed");
      }
      await fetchRules();
    },
    [wallet, fetchRules],
  );

  return { rules, loading, addRule, removeRule };
}
