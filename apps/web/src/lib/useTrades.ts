"use client";

import { useCallback, useEffect, useState } from "react";
import type { TradeRecord, TradePnL } from "./types/trade";

/** Compute per-mint PnL from a list of trades (client-side, no price data). */
function computePnL(trades: TradeRecord[]): TradePnL[] {
  const byMint = new Map<string, TradePnL>();

  for (const t of trades) {
    let entry = byMint.get(t.mint);
    if (!entry) {
      entry = {
        mint: t.mint,
        symbol: t.symbol,
        totalBoughtSol: 0,
        totalSoldSol: 0,
        remainingTokens: 0,
        realizedPnlSol: 0,
        realizedPnlUsd: 0,
        unrealizedPnlSol: null,
        currentPriceUsd: null,
      };
      byMint.set(t.mint, entry);
    }

    if (t.side === "buy") {
      entry.totalBoughtSol += t.amountSol;
      entry.remainingTokens += t.amountToken;
    } else {
      entry.totalSoldSol += t.amountSol;
      entry.remainingTokens -= t.amountToken;

      // Realized PnL: SOL received for sold tokens
      // Simple FIFO approximation: avg cost basis
      const avgCostSol =
        entry.totalBoughtSol > 0 && entry.remainingTokens + t.amountToken > 0
          ? entry.totalBoughtSol / (entry.remainingTokens + t.amountToken)
          : 0;
      const costBasis = avgCostSol * t.amountToken;
      entry.realizedPnlSol += t.amountSol - costBasis;
      entry.realizedPnlUsd += (t.amountSol - costBasis) * t.priceUsd;
    }

    // Keep symbol up to date (latest trade wins)
    entry.symbol = t.symbol;
  }

  return Array.from(byMint.values());
}

export interface UseTradesResult {
  trades: TradeRecord[];
  pnl: TradePnL[];
  loading: boolean;
  recordTrade: (t: Omit<TradeRecord, "id">) => Promise<void>;
}

export function useTrades(wallet: string | null): UseTradesResult {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setTrades([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/trades?wallet=${encodeURIComponent(wallet)}&limit=50`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`trades ${r.status}`);
        const d = (await r.json()) as { trades?: TradeRecord[] };
        if (!cancelled) setTrades(d.trades ?? []);
      })
      .catch((err) => {
        console.error("[useTrades] fetch error:", err);
        if (!cancelled) setTrades([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const recordTrade = useCallback(
    async (trade: Omit<TradeRecord, "id">) => {
      const r = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: "record failed" }));
        throw new Error((e as { error?: string }).error ?? "recordTrade failed");
      }
      const d = (await r.json()) as { id?: string };
      // Optimistically prepend to local state
      const newRecord: TradeRecord = { ...trade, id: d.id ?? `local-${Date.now()}` };
      setTrades((prev) => [newRecord, ...prev]);
    },
    [],
  );

  const pnl = computePnL(trades);

  return { trades, pnl, loading, recordTrade };
}
