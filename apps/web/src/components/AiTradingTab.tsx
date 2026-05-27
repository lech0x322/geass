"use client";

import React, { useState, useCallback } from "react";
import { useAiTrading, RISK_PRESETS } from "@/lib/useAiTrading";
import type { TradingSignal, TradeDecision, Position, AiTradingConfig } from "@/lib/useAiTrading";
import {
  IconZap, IconTarget, IconChart, IconCog, IconRefresh,
  IconCheck, IconX, IconArrowUpRight, IconShield,
} from "./icons";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

function pct(n: number, digits = 1) { return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`; }
function fmtSol(n: number) { return `${n.toFixed(3)} SOL`; }
function fmtAge(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)    return `${d}s`;
  if (d < 3600)  return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

function ConfidenceBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const color = value >= 75 ? "#22c55e" : value >= 55 ? "#f97316" : "#ef4444";
  const h = size === "sm" ? 3 : 5;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: h, background: "#18181c", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: size === "sm" ? 9 : 10, color, fontWeight: 700, minWidth: 24, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status, isPaper }: { status: string; isPaper: boolean }) {
  const colors: Record<string, string> = {
    open: "#22c55e", closed: "#52525b", failed: "#ef4444",
  };
  const c = colors[status] ?? "#52525b";
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <span style={{ fontSize: 9, padding: "1px 6px", fontWeight: 700, background: `${c}18`, color: c, border: `1px solid ${c}44` }}>
        {status.toUpperCase()}
      </span>
      {isPaper && (
        <span style={{ fontSize: 9, padding: "1px 6px", fontWeight: 700, background: "#3b82f618", color: "#3b82f6", border: "1px solid #3b82f644" }}>
          PAPER
        </span>
      )}
    </div>
  );
}

// ── Sub-tab bar ───────────────────────────────────────────────────────────────

type SubTab = "dashboard" | "signals" | "positions" | "settings";

function SubTabBar({ active, onChange }: { active: SubTab; onChange: (t: SubTab) => void }) {
  const tabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard",  label: "Dashboard",  icon: <IconChart size={11} /> },
    { id: "signals",    label: "Signals",    icon: <IconZap   size={11} /> },
    { id: "positions",  label: "Positions",  icon: <IconTarget size={11} /> },
    { id: "settings",   label: "Settings",   icon: <IconCog   size={11} /> },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #1e1e21", marginBottom: 20 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          border: `1px solid ${active === t.id ? "#ff2b4e" : "#1e1e21"}`,
          borderBottom: active === t.id ? "1px solid #ff2b4e" : "1px solid transparent",
          background: active === t.id ? "#ff2b4e14" : "transparent",
          color: active === t.id ? "#ff2b4e" : "#52525b",
          fontSize: 11, fontWeight: active === t.id ? 700 : 500, cursor: "pointer",
          fontFamily: MONO, marginBottom: -1, transition: "all .15s",
        }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ at, isMobile }: { at: ReturnType<typeof useAiTrading>; isMobile: boolean }) {
  const { stats, config, positions, emergencyStop, executing } = at;
  const openPositions = positions.filter(p => p.status === "open");
  const closedPositions = positions.filter(p => p.status === "closed");

  const totalPnl   = stats?.totalPnlSol ?? 0;
  const winRate    = stats?.winRate ?? 0;
  const totalTrades = stats?.totalTrades ?? 0;
  const dailyLoss  = stats?.dailyLossSol ?? 0;

  return (
    <div>
      {/* Mode banner */}
      <div style={{
        background: config.mode === "paper" ? "#3b82f618" : "#ff2b4e18",
        border: `1px solid ${config.mode === "paper" ? "#3b82f644" : "#ff2b4e44"}`,
        padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: config.mode === "paper" ? "#3b82f6" : "#ff2b4e", flexShrink: 0 }} className="pulse" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: config.mode === "paper" ? "#3b82f6" : "#ff2b4e" }}>
            {config.mode === "paper" ? "📄 Paper Trading Mode" : "⚡ Live Trading Mode"}
          </div>
          <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>
            {config.mode === "paper"
              ? "Simulated trades — no real SOL at risk. Switch to Live in Settings."
              : "Real trades executing with GEASS internal wallet. Monitor carefully."}
          </div>
        </div>
        {config.mode === "live" && (
          <button onClick={emergencyStop} disabled={executing} style={{
            marginLeft: "auto", background: "#ef4444", border: "none", color: "#fff",
            padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: executing ? "not-allowed" : "pointer",
            fontFamily: MONO, flexShrink: 0,
          }}>
            🛑 STOP ALL
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Total PnL",    value: fmtSol(totalPnl),        color: totalPnl >= 0 ? "#22c55e" : "#ef4444", sub: totalPnl >= 0 ? "profit" : "loss" },
          { label: "Win Rate",     value: `${winRate.toFixed(0)}%`, color: winRate >= 50 ? "#22c55e" : "#f97316", sub: `${stats?.winCount ?? 0}W / ${stats?.lossCount ?? 0}L` },
          { label: "Total Trades", value: String(totalTrades),      color: "#a855f7", sub: `${openPositions.length} open` },
          { label: "Daily Loss",   value: fmtSol(dailyLoss),        color: dailyLoss >= (config.maxDailyLossSol * 0.8) ? "#ef4444" : "#52525b", sub: `max ${fmtSol(config.maxDailyLossSol)}` },
        ].map(s => (
          <div key={s.label} style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#52525b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily loss progress */}
      {dailyLoss > 0 && (
        <div style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "12px 14px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 10 }}>
            <span style={{ color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Daily Loss Limit</span>
            <span style={{ color: dailyLoss >= config.maxDailyLossSol ? "#ef4444" : "#f97316" }}>
              {fmtSol(dailyLoss)} / {fmtSol(config.maxDailyLossSol)}
            </span>
          </div>
          <div style={{ height: 4, background: "#18181c", overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, (dailyLoss / config.maxDailyLossSol) * 100)}%`,
              height: "100%",
              background: dailyLoss >= config.maxDailyLossSol * 0.8 ? "#ef4444" : "#f97316",
              transition: "width .3s",
            }} />
          </div>
        </div>
      )}

      {/* Open positions summary */}
      {openPositions.length > 0 && (
        <div style={{ background: "#0d0d10", border: "1px solid #1e1e21", marginBottom: 20 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a1a1e", fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Open Positions ({openPositions.length})
          </div>
          {openPositions.map(p => (
            <PositionRow key={p.id} p={p} onClose={at.closePosition} />
          ))}
        </div>
      )}

      {/* Recent closed */}
      {closedPositions.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Recent Trades
          </div>
          {closedPositions.slice(0, 5).map(p => (
            <PositionRow key={p.id} p={p} onClose={at.closePosition} />
          ))}
        </div>
      )}

      {totalTrades === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 12 }}>
          <IconChart size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.2 }} />
          No trades yet. Go to Signals and execute your first AI trade.
        </div>
      )}
    </div>
  );
}

// ── Signals Panel ─────────────────────────────────────────────────────────────

function SignalsPanel({ at }: { at: ReturnType<typeof useAiTrading> }) {
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, { decision: TradeDecision; riskBlocked: boolean; riskReason?: string }>>({});
  const [execDone,  setExecDone]  = useState<Set<string>>(new Set());

  const handleAnalyze = useCallback(async (signal: TradingSignal) => {
    setAnalyzing(signal.id);
    const result = await at.analyzeSignal(signal);
    if (result) setDecisions(prev => ({ ...prev, [signal.id]: result }));
    setAnalyzing(null);
  }, [at]);

  const handleExecute = useCallback(async (signal: TradingSignal) => {
    const d = decisions[signal.id];
    if (!d || d.decision.action !== "buy") return;
    const pos = await at.executeSignal(signal, d.decision);
    if (pos) setExecDone(prev => new Set([...prev, signal.id]));
  }, [at, decisions]);

  const sourceColor: Record<string, string> = {
    kol_buy: "#ef4444", volume_surge: "#f97316",
    meme_scan: "#a855f7", x_mention: "#3b82f6", ai_scan: "#22c55e",
  };
  const sourceLabel: Record<string, string> = {
    kol_buy: "KOL BUY", volume_surge: "VOL SURGE",
    meme_scan: "MEME SCAN", x_mention: "X MENTION", ai_scan: "AI SCAN",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
          {at.signals.length} Signals
        </div>
        <button onClick={at.refreshSignals} disabled={at.loadingSignals} style={{
          background: "transparent", border: "1px solid #27272a", color: at.loadingSignals ? "#3f3f46" : "#71717a",
          padding: "5px 10px", fontSize: 10, cursor: at.loadingSignals ? "not-allowed" : "pointer",
          fontFamily: MONO, display: "flex", alignItems: "center", gap: 4,
        }}>
          <IconRefresh size={10} /> Refresh
        </button>
      </div>

      {at.loadingSignals && !at.signals.length && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 12 }}>
          Scanning markets…
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {at.signals.map(sig => {
          const dec  = decisions[sig.id];
          const done = execDone.has(sig.id);
          const srcColor = sourceColor[sig.source] ?? "#52525b";
          return (
            <div key={sig.id} style={{ background: "#0d0d10", border: "1px solid #1e1e21" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: dec ? "1px solid #1a1a1e" : "none" }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 6px", flexShrink: 0,
                  background: `${srcColor}18`, color: srcColor, border: `1px solid ${srcColor}44`,
                }}>
                  {sourceLabel[sig.source] ?? sig.source}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>${sig.symbol}</span>
                <span style={{ fontSize: 10, color: "#52525b", flex: 1 }}>{sig.name.slice(0, 30)}</span>
                <span style={{
                  fontSize: 9, padding: "1px 5px", fontWeight: 700,
                  background: sig.urgency === "high" ? "#ef444418" : sig.urgency === "medium" ? "#f9731618" : "#3f3f4620",
                  color: sig.urgency === "high" ? "#ef4444" : sig.urgency === "medium" ? "#f97316" : "#52525b",
                  border: `1px solid ${sig.urgency === "high" ? "#ef444444" : sig.urgency === "medium" ? "#f9731644" : "#3f3f46"}`,
                }}>
                  {sig.urgency.toUpperCase()}
                </span>
              </div>

              {/* Confidence + reasons */}
              <div style={{ padding: "8px 14px" }}>
                <ConfidenceBar value={sig.confidence} />
                <div style={{ fontSize: 10, color: "#52525b", marginTop: 5 }}>
                  {sig.reasons.join(" · ")}
                </div>
              </div>

              {/* AI decision result */}
              {dec && (
                <div style={{ padding: "8px 14px", borderTop: "1px solid #1a1a1e", background: "#0a0a0c" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px",
                      background: dec.decision.action === "buy" ? "#22c55e18" : dec.decision.action === "skip" ? "#52525b20" : "#ef444418",
                      color: dec.decision.action === "buy" ? "#22c55e" : dec.decision.action === "skip" ? "#71717a" : "#ef4444",
                      border: `1px solid ${dec.decision.action === "buy" ? "#22c55e44" : dec.decision.action === "skip" ? "#52525b" : "#ef444444"}`,
                    }}>
                      AI: {dec.decision.action.toUpperCase()}
                    </span>
                    {dec.decision.action === "buy" && (
                      <>
                        <span style={{ fontSize: 10, color: "#a1a1aa" }}>{fmtSol(dec.decision.amountSol)}</span>
                        <span style={{ fontSize: 10, color: "#52525b" }}>SL -{dec.decision.stopLossPct}% / TP +{dec.decision.takeProfitPct}%</span>
                      </>
                    )}
                    {dec.riskBlocked && (
                      <span style={{ fontSize: 10, color: "#f59e0b" }}>⚠️ {dec.riskReason}</span>
                    )}
                    <span style={{ fontSize: 10, color: "#3f3f46", flex: 1, textAlign: "right" }}>{dec.decision.reason}</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ padding: "8px 14px", borderTop: "1px solid #1a1a1e", display: "flex", gap: 6 }}>
                {done ? (
                  <span style={{ fontSize: 11, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                    <IconCheck size={12} /> Position opened
                  </span>
                ) : (
                  <>
                    <button onClick={() => handleAnalyze(sig)} disabled={analyzing === sig.id} style={{
                      background: "transparent", border: "1px solid #27272a", color: "#71717a",
                      padding: "5px 12px", fontSize: 10, cursor: analyzing === sig.id ? "not-allowed" : "pointer",
                      fontFamily: MONO, display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {analyzing === sig.id ? "Analyzing…" : "🤖 Ask AI"}
                    </button>
                    {dec?.decision.action === "buy" && !dec.riskBlocked && (
                      <button onClick={() => handleExecute(sig)} disabled={at.executing} style={{
                        background: "#22c55e", border: "none", color: "#000",
                        padding: "5px 14px", fontSize: 10, fontWeight: 700, cursor: at.executing ? "not-allowed" : "pointer",
                        fontFamily: MONO,
                      }}>
                        {at.executing ? "Executing…" : `⚡ ${at.config.mode === "paper" ? "Paper" : "Live"} Buy`}
                      </button>
                    )}
                  </>
                )}
                <a href={`https://dexscreener.com/solana/${sig.mint}`} target="_blank" rel="noreferrer"
                  style={{ marginLeft: "auto", color: "#3f3f46", display: "flex", alignItems: "center" }}>
                  <IconArrowUpRight size={12} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Position row ──────────────────────────────────────────────────────────────

function PositionRow({ p, onClose }: { p: Position; onClose: (id: string) => void }) {
  const pnlColor = (p.pnlSol ?? 0) >= 0 ? "#22c55e" : "#ef4444";
  const isOpen = p.status === "open";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderBottom: "1px solid #111114", fontSize: 11,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: "#f4f4f5" }}>${p.symbol}</span>
          <StatusBadge status={p.status} isPaper={p.isPaper} />
        </div>
        <div style={{ fontSize: 10, color: "#52525b" }}>
          {fmtSol(p.amountSol)} · Entry: {p.entryPriceSol?.toExponential(3)} SOL
          {p.closedReason && ` · ${p.closedReason.replace("_", " ")}`}
        </div>
        <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>{p.aiReason}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {isOpen ? (
          <>
            <div style={{ fontSize: 10, color: "#52525b" }}>SL -{p.stopLossPct}% / TP +{p.takeProfitPct}%</div>
            <div style={{ fontSize: 10, color: "#3f3f46" }}>{fmtAge(p.openedAt)}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: pnlColor }}>{pct(p.pnlPct ?? 0)}</div>
            <div style={{ fontSize: 10, color: pnlColor }}>{(p.pnlSol ?? 0) >= 0 ? "+" : ""}{fmtSol(p.pnlSol ?? 0)}</div>
          </>
        )}
      </div>
      {isOpen && (
        <button onClick={() => onClose(p.id)} style={{
          background: "transparent", border: "1px solid #27272a", color: "#71717a",
          padding: "4px 8px", fontSize: 9, cursor: "pointer", fontFamily: MONO, flexShrink: 0,
        }}>Close</button>
      )}
    </div>
  );
}

// ── Positions Panel ───────────────────────────────────────────────────────────

function PositionsPanel({ at }: { at: ReturnType<typeof useAiTrading> }) {
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const filtered = filter === "open" ? at.positions.filter(p => p.status === "open")
                 : filter === "closed" ? at.positions.filter(p => p.status !== "open")
                 : at.positions;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {(["all", "open", "closed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? "#ff2b4e14" : "transparent",
            border: `1px solid ${filter === f ? "#ff2b4e" : "#27272a"}`,
            color: filter === f ? "#ff2b4e" : "#52525b",
            padding: "5px 12px", fontSize: 10, cursor: "pointer", fontFamily: MONO, fontWeight: filter === f ? 700 : 400,
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
        <button onClick={at.clearHistory} style={{
          marginLeft: "auto", background: "transparent", border: "1px solid #27272a", color: "#52525b",
          padding: "5px 10px", fontSize: 10, cursor: "pointer", fontFamily: MONO,
        }}>Clear History</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 12 }}>
          <IconTarget size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.2 }} />
          No positions yet.
        </div>
      ) : (
        <div style={{ background: "#0d0d10", border: "1px solid #1e1e21" }}>
          {filtered.map(p => <PositionRow key={p.id} p={p} onClose={at.closePosition} />)}
        </div>
      )}
    </div>
  );
}

// ── Settings Panel ─────────────────────────────────────────────────────────────

function SettingsPanel({ at, isElite }: { at: ReturnType<typeof useAiTrading>; isElite: boolean }) {
  const { config, updateConfig, applyPreset } = at;
  const [showLiveWarning, setShowLiveWarning] = useState(false);

  const inp: React.CSSProperties = {
    background: "#0a0a0c", border: "1px solid #1e1e21", color: "#f4f4f5",
    padding: "7px 10px", fontSize: 11, outline: "none", fontFamily: MONO,
    width: "100%", boxSizing: "border-box",
  };

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );

  const row = (label: string, sub: string, children: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: "#f4f4f5" }}>{label}</div>
        <div style={{ fontSize: 10, color: "#3f3f46" }}>{sub}</div>
      </div>
      <div style={{ minWidth: 120 }}>{children}</div>
    </div>
  );

  return (
    <div>
      {/* Risk presets */}
      {section("Risk Profile", (
        <div style={{ display: "flex", gap: 6 }}>
          {(["conservative", "moderate", "aggressive"] as const).map(p => (
            <button key={p} onClick={() => applyPreset(p)} style={{
              flex: 1, padding: "8px 4px", fontSize: 10, fontWeight: config.riskProfile === p ? 700 : 400,
              border: `1px solid ${config.riskProfile === p ? "#ff2b4e" : "#27272a"}`,
              background: config.riskProfile === p ? "#ff2b4e18" : "transparent",
              color: config.riskProfile === p ? "#ff2b4e" : "#52525b",
              cursor: "pointer", fontFamily: MONO, textTransform: "capitalize",
            }}>{p}</button>
          ))}
        </div>
      ))}

      {/* Position sizing */}
      {section("Position Sizing", (
        <>
          {row("Max Position Size", "Max SOL per single trade",
            <input type="number" step="0.05" min="0.01" max="2" value={config.maxPositionSol}
              onChange={e => updateConfig({ maxPositionSol: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          )}
          {row("Max Open Positions", "Simultaneous open trades",
            <input type="number" step="1" min="1" max="20" value={config.maxOpenPositions}
              onChange={e => updateConfig({ maxOpenPositions: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          )}
          {row("Daily Loss Limit", "Stop trading if daily loss exceeds",
            <input type="number" step="0.1" min="0.1" max="10" value={config.maxDailyLossSol}
              onChange={e => updateConfig({ maxDailyLossSol: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          )}
        </>
      ))}

      {/* SL/TP */}
      {section("Stop Loss / Take Profit", (
        <>
          {row("Stop Loss %", "Close position if down by this %",
            <input type="number" step="1" min="5" max="50" value={config.stopLossPct}
              onChange={e => updateConfig({ stopLossPct: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          )}
          {row("Take Profit %", "Close position if up by this %",
            <input type="number" step="5" min="10" max="500" value={config.takeProfitPct}
              onChange={e => updateConfig({ takeProfitPct: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          )}
        </>
      ))}

      {/* Filtering */}
      {section("Signal Filters", (
        <>
          {row("Min Confidence", "Ignore signals below this AI confidence score",
            <input type="number" step="5" min="0" max="100" value={config.minConfidence}
              onChange={e => updateConfig({ minConfidence: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          )}
          {row("Min GEASS Score", "Ignore tokens below this safety score",
            <input type="number" step="5" min="0" max="100" value={config.minScore}
              onChange={e => updateConfig({ minScore: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          )}
        </>
      ))}

      {/* Mode switch */}
      {section("Trading Mode", (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => updateConfig({ mode: "paper" })} style={{
              flex: 1, padding: "10px", fontSize: 11, fontWeight: config.mode === "paper" ? 700 : 400,
              border: `1px solid ${config.mode === "paper" ? "#3b82f6" : "#27272a"}`,
              background: config.mode === "paper" ? "#3b82f618" : "transparent",
              color: config.mode === "paper" ? "#3b82f6" : "#52525b",
              cursor: "pointer", fontFamily: MONO,
            }}>📄 Paper</button>
            <button onClick={() => { if (!isElite) return; setShowLiveWarning(true); }} style={{
              flex: 1, padding: "10px", fontSize: 11, fontWeight: config.mode === "live" ? 700 : 400,
              border: `1px solid ${config.mode === "live" ? "#ff2b4e" : isElite ? "#27272a" : "#1a1a1e"}`,
              background: config.mode === "live" ? "#ff2b4e18" : "transparent",
              color: config.mode === "live" ? "#ff2b4e" : isElite ? "#52525b" : "#2a2a30",
              cursor: isElite ? "pointer" : "not-allowed", fontFamily: MONO,
              opacity: isElite ? 1 : 0.5,
            }}>
              ⚡ Live {!isElite && "🔒"}
            </button>
          </div>
          {!isElite && (
            <div style={{ fontSize: 10, color: "#f59e0b", padding: "8px 10px", background: "#f59e0b18", border: "1px solid #f59e0b44" }}>
              🔒 Live trading requires GEASS ELITE. Upgrade in the Pro section.
            </div>
          )}
          {showLiveWarning && (
            <div style={{ background: "#ef444418", border: "1px solid #ef444444", padding: "12px 14px", marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 6 }}>⚠️ Enable Live Trading?</div>
              <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 10, lineHeight: 1.5 }}>
                Real SOL will be traded using the GEASS internal wallet. You can lose money.
                Ensure your wallet is funded and start with small positions.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { updateConfig({ mode: "live" }); setShowLiveWarning(false); }} style={{
                  background: "#ef4444", border: "none", color: "#fff",
                  padding: "6px 14px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: MONO,
                }}>I understand, enable</button>
                <button onClick={() => setShowLiveWarning(false)} style={{
                  background: "transparent", border: "1px solid #27272a", color: "#71717a",
                  padding: "6px 12px", fontSize: 10, cursor: "pointer", fontFamily: MONO,
                }}>Cancel</button>
              </div>
            </div>
          )}
        </>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface AiTradingTabProps {
  wallet:   string;
  isMobile: boolean;
  isElite?: boolean; // GEASS ELITE subscriber
}

export function AiTradingTab({ wallet, isMobile, isElite = false }: AiTradingTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("dashboard");
  const at = useAiTrading(wallet);

  return (
    <div style={{
      maxWidth: 760, margin: "0 auto",
      padding: isMobile ? "14px 12px 80px" : "20px 0 40px",
      fontFamily: MONO,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5",
          display: "flex", alignItems: "center", gap: 8, margin: 0, marginBottom: 4,
        }}>
          <span style={{ fontSize: isMobile ? 16 : 20 }}>🤖</span>
          AI Auto-Trading
          <span style={{ fontSize: 9, padding: "2px 7px", background: "#a855f722", color: "#a855f7", border: "1px solid #a855f744", fontWeight: 700 }}>
            {at.config.mode === "paper" ? "PAPER" : "LIVE"}
          </span>
        </h1>
        <p style={{ fontSize: 11, color: "#3f3f46", margin: 0 }}>
          AI-powered signals · Auto execute · Stop loss / take profit
        </p>
        {at.error && (
          <div style={{ marginTop: 8, fontSize: 10, color: "#ef4444", background: "#ef444418", border: "1px solid #ef444444", padding: "6px 10px" }}>
            ⚠️ {at.error}
          </div>
        )}
      </div>

      <SubTabBar active={subTab} onChange={setSubTab} />

      {subTab === "dashboard"  && <Dashboard  at={at} isMobile={isMobile} />}
      {subTab === "signals"    && <SignalsPanel at={at} />}
      {subTab === "positions"  && <PositionsPanel at={at} />}
      {subTab === "settings"   && <SettingsPanel at={at} isElite={isElite} />}
    </div>
  );
}
