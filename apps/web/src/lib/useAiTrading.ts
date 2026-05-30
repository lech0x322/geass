"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TradingSignal, TradeDecision, Position, TradingStats, RiskConfig } from "./server/aiTradingEngine";

// Re-export types for client usage
export type { TradingSignal, TradeDecision, Position, TradingStats, RiskConfig };

// ── Config stored in localStorage ─────────────────────────────────────────────

export interface AiTradingConfig {
  enabled:         boolean;
  riskProfile:     "conservative" | "moderate" | "aggressive";
  maxPositionSol:  number;
  maxOpenPositions: number;
  stopLossPct:     number;
  takeProfitPct:   number;
  maxDailyLossSol: number;
  minConfidence:   number;
  minScore:        number;
  autoExecute:     boolean; // if false, only show signals, don't auto-trade
}

const RISK_PRESETS: Record<AiTradingConfig["riskProfile"], Partial<AiTradingConfig>> = {
  conservative: { maxPositionSol: 0.1, stopLossPct: 15, takeProfitPct: 40, minConfidence: 75, minScore: 65 },
  moderate:     { maxPositionSol: 0.3, stopLossPct: 20, takeProfitPct: 60, minConfidence: 60, minScore: 55 },
  aggressive:   { maxPositionSol: 0.5, stopLossPct: 25, takeProfitPct: 100, minConfidence: 50, minScore: 45 },
};

export { RISK_PRESETS };

const DEFAULT_CONFIG: AiTradingConfig = {
  enabled:          false,
  riskProfile:      "moderate",
  maxPositionSol:   0.3,
  maxOpenPositions: 5,
  stopLossPct:      20,
  takeProfitPct:    60,
  maxDailyLossSol:  1.0,
  minConfidence:    60,
  minScore:         55,
  autoExecute:      false,
};

const CONFIG_KEY = "geass:autotrading:config";

function loadConfig(): AiTradingConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "{}") }; }
  catch { return DEFAULT_CONFIG; }
}

function saveConfig(c: AiTradingConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface AiTradingState {
  config:        AiTradingConfig;
  signals:       TradingSignal[];
  positions:     Position[];
  stats:         TradingStats | null;
  loadingSignals: boolean;
  loadingPositions: boolean;
  executing:     boolean;
  error:         string | null;

  updateConfig:    (patch: Partial<AiTradingConfig>) => void;
  applyPreset:     (profile: AiTradingConfig["riskProfile"]) => void;
  refreshSignals:  () => Promise<void>;
  refreshPositions: () => Promise<void>;
  analyzeSignal:   (signal: TradingSignal) => Promise<{ decision: TradeDecision; riskBlocked: boolean; riskReason?: string } | null>;
  executeSignal:   (signal: TradingSignal, decision: TradeDecision) => Promise<Position | null>;
  closePosition:   (posId: string) => Promise<void>;
  emergencyStop:   () => Promise<void>;
  monitorPositions: () => Promise<void>;
  clearHistory:    () => Promise<void>;
}

export function useAiTrading(wallet: string | null): AiTradingState {
  const [config,    setConfigState]    = useState<AiTradingConfig>(loadConfig);
  const [signals,   setSignals]        = useState<TradingSignal[]>([]);
  const [positions, setPositions]      = useState<Position[]>([]);
  const [stats,     setStats]          = useState<TradingStats | null>(null);
  const [loadingSignals,   setLoadingSignals]   = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [executing, setExecuting]      = useState(false);
  const [error,     setError]          = useState<string | null>(null);

  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateConfig = useCallback((patch: Partial<AiTradingConfig>) => {
    setConfigState(prev => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  }, []);

  const applyPreset = useCallback((profile: AiTradingConfig["riskProfile"]) => {
    updateConfig({ riskProfile: profile, ...RISK_PRESETS[profile] });
  }, [updateConfig]);

  const refreshSignals = useCallback(async () => {
    setLoadingSignals(true);
    setError(null);
    try {
      const r = await fetch("/api/ai-trading/signals", { cache: "no-store" });
      if (!r.ok) throw new Error(`signals ${r.status}`);
      const d = await r.json() as { signals: TradingSignal[] };
      setSignals(d.signals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoadingSignals(false);
  }, []);

  const refreshPositions = useCallback(async () => {
    if (!wallet) return;
    setLoadingPositions(true);
    try {
      const r = await fetch(`/api/ai-trading/positions?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`positions ${r.status}`);
      const d = await r.json() as { positions: Position[]; stats: TradingStats };
      setPositions(d.positions ?? []);
      setStats(d.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoadingPositions(false);
  }, [wallet]);

  const analyzeSignal = useCallback(async (signal: TradingSignal) => {
    if (!wallet) return null;
    try {
      const r = await fetch("/api/ai-trading/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal, wallet, risk: {
          maxPositionSol:   config.maxPositionSol,
          maxOpenPositions: config.maxOpenPositions,
          stopLossPct:      config.stopLossPct,
          takeProfitPct:    config.takeProfitPct,
          maxDailyLossSol:  config.maxDailyLossSol,
          minConfidence:    config.minConfidence,
          minScore:         config.minScore,
        }}),
      });
      if (!r.ok) throw new Error(`analyze ${r.status}`);
      return await r.json() as { decision: TradeDecision; riskBlocked: boolean; riskReason?: string };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [wallet, config]);

  const executeSignal = useCallback(async (signal: TradingSignal, decision: TradeDecision): Promise<Position | null> => {
    if (!wallet) return null;
    setExecuting(true);
    setError(null);
    try {
      const r = await fetch("/api/ai-trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal, decision, wallet,
          isPaper: false,
          risk: {
            maxPositionSol:   config.maxPositionSol,
            maxOpenPositions: config.maxOpenPositions,
            stopLossPct:      config.stopLossPct,
            takeProfitPct:    config.takeProfitPct,
            maxDailyLossSol:  config.maxDailyLossSol,
            minConfidence:    config.minConfidence,
            minScore:         config.minScore,
          },
        }),
      });
      if (!r.ok) {
        const d = await r.json() as { error?: string };
        throw new Error(d.error ?? `execute ${r.status}`);
      }
      const d = await r.json() as { position: Position };
      await refreshPositions();
      return d.position;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setExecuting(false);
    }
  }, [wallet, config, refreshPositions]);

  const closePosition = useCallback(async (posId: string) => {
    if (!wallet) return;
    try {
      await fetch(`/api/ai-trading/positions?wallet=${encodeURIComponent(wallet)}&id=${posId}&paper=false`, {
        method: "DELETE",
      });
      await refreshPositions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [wallet, refreshPositions]);

  const emergencyStop = useCallback(async () => {
    if (!wallet) return;
    setExecuting(true);
    try {
      await fetch("/api/ai-trading/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, isPaper: false }),
      });
      await refreshPositions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setExecuting(false);
  }, [wallet, refreshPositions]);

  const monitorPositions = useCallback(async () => {
    if (!wallet) return;
    try {
      await fetch("/api/ai-trading/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, isPaper: false }),
      });
      await refreshPositions();
    } catch {}
  }, [wallet, refreshPositions]);

  const clearHistory = useCallback(async () => {
    if (!wallet) return;
    await fetch(`/api/ai-trading/positions?wallet=${encodeURIComponent(wallet)}`, { method: "DELETE" });
    await refreshPositions();
  }, [wallet, refreshPositions]);

  // Initial load
  useEffect(() => {
    refreshSignals();
    if (wallet) refreshPositions();
  }, [wallet, refreshSignals, refreshPositions]);

  // Auto-monitor open positions every 30s when enabled
  useEffect(() => {
    if (monitorRef.current) clearInterval(monitorRef.current);
    if (config.enabled && wallet) {
      monitorRef.current = setInterval(monitorPositions, 30_000);
    }
    return () => { if (monitorRef.current) clearInterval(monitorRef.current); };
  }, [config.enabled, wallet, monitorPositions]);

  return {
    config, signals, positions, stats,
    loadingSignals, loadingPositions, executing, error,
    updateConfig, applyPreset, refreshSignals, refreshPositions,
    analyzeSignal, executeSignal, closePosition, emergencyStop,
    monitorPositions, clearHistory,
  };
}
