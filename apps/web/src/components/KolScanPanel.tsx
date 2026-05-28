"use client";

import React, { useState, useMemo } from "react";
import { KOLS } from "@/lib/config";
import { useKolFeed } from "@/lib/useKolFeed";
import {
  IconArrowUpRight, IconTrendingUp, IconBroadcast, IconRocket, IconTarget,
} from "./icons";
import type { FeedTrade } from "@/lib/types";

// ── Shared ─────────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
};

function fmtAgo(s: number) {
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function SubTab({
  label, active, onClick, badge,
}: { label: string; active: boolean; onClick: () => void; badge?: string }) {
  return (
    <button onClick={onClick} style={{
      ...MONO, display: "flex", alignItems: "center", gap: 5,
      padding: "7px 14px", fontSize: 11, fontWeight: active ? 700 : 500,
      cursor: "pointer", color: active ? "#ff2b4e" : "#52525b",
      background: active ? "#ff2b4e14" : "transparent",
      border: `1px solid ${active ? "#ff2b4e" : "#1e1e21"}`,
      borderBottom: active ? "1px solid #ff2b4e" : "1px solid transparent",
      marginBottom: -1, transition: "color .15s, background .15s, border-color .15s",
    }}>
      {label}
      {badge && (
        <span style={{
          fontSize: 8, fontWeight: 800, padding: "1px 4px",
          background: active ? "#ff2b4e" : "#27272a",
          color: active ? "#fff" : "#71717a",
        }}>{badge}</span>
      )}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. KOL LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════════

type TimeFrame = "daily" | "weekly" | "monthly";

function computeLeaderboard(trades: FeedTrade[], tf: TimeFrame) {
  const now    = Date.now();
  const cutoff = tf === "daily"   ? now - 86_400_000
               : tf === "weekly"  ? now - 7 * 86_400_000
               : now - 30 * 86_400_000;

  const winMap  = new Map<string, number>();
  const lossMap = new Map<string, number>();
  const solMap  = new Map<string, number>();

  for (const t of trades) {
    const ts = t.ts ?? (Date.now() - t.ago * 1000);
    if (ts < cutoff) continue;
    if (t.type === "buy") {
      winMap.set(t.kol,  (winMap.get(t.kol)  ?? 0) + 1);
      solMap.set(t.kol,  (solMap.get(t.kol)  ?? 0) + parseFloat(t.sol || "0"));
    } else {
      lossMap.set(t.kol, (lossMap.get(t.kol) ?? 0) + 1);
    }
  }

  return KOLS.map((k, i) => {
    const wins   = winMap.get(k.name)  ?? 0;
    const losses = lossMap.get(k.name) ?? 0;
    const solVol = solMap.get(k.name)  ?? 0;
    const liveWr = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : k.wr;
    return { ...k, rank: i + 1, wins, losses, solVol, liveWr };
  })
    .sort((a, b) => b.liveWr - a.liveWr)
    .map((k, i) => ({ ...k, rank: i + 1 }));
}

function KolLeaderboard({ trades }: { trades: FeedTrade[] }) {
  const [tf, setTf] = useState<TimeFrame>("daily");
  const board = useMemo(() => computeLeaderboard(trades, tf), [trades, tf]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          KOL Leaderboard · {board.length}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {(["daily", "weekly", "monthly"] as TimeFrame[]).map(t => (
            <button key={t} onClick={() => setTf(t)} style={{
              ...MONO, fontSize: 9, fontWeight: tf === t ? 700 : 500, padding: "4px 10px",
              cursor: "pointer", color: tf === t ? "#ff2b4e" : "#52525b",
              background: tf === t ? "#ff2b4e14" : "transparent",
              border: `1px solid ${tf === t ? "#ff2b4e" : "#27272a"}`,
              textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {board.map(k => (
          <div key={k.addr} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: k.rank === 1 ? "#eab30808" : "#0d0d10",
            border: `1px solid ${k.rank === 1 ? "#eab30844" : k.rank <= 3 ? "#ff2b4e22" : "#1e1e21"}`,
            padding: "10px 14px",
          }}>
            {/* Rank */}
            <div style={{
              width: 22, flexShrink: 0, textAlign: "center",
              fontSize: k.rank === 1 ? 16 : 12, fontWeight: 800,
              color: k.rank === 1 ? "#eab308" : k.rank <= 3 ? "#ff2b4e" : "#3f3f46",
            }}>
              {k.rank === 1 ? "🏆" : k.rank}
            </div>

            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: `${k.c}1a`, border: `1px solid ${k.c}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: k.c,
            }}>
              {k.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Name + handle + win-rate bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5", ...MONO }}>{k.name}</span>
                <a href={`https://twitter.com/${k.tw}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 9, color: "#3f3f46", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                  X <IconArrowUpRight size={8} />
                </a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, maxWidth: 100, height: 3, background: "#18181c", overflow: "hidden", borderRadius: 2 }}>
                  <div style={{
                    width: `${k.liveWr}%`, height: "100%", borderRadius: 2,
                    background: k.liveWr >= 65 ? "#10b981" : k.liveWr >= 50 ? "#eab308" : "#ef4444",
                    transition: "width .3s",
                  }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: k.c, ...MONO }}>{k.liveWr}%</span>
              </div>
            </div>

            {/* Wins / Losses */}
            <div style={{ textAlign: "center", minWidth: 54, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, ...MONO }}>
                <span style={{ color: "#22c55e" }}>
                  {k.wins > 0 ? k.wins : k.trades}
                </span>
                <span style={{ color: "#3f3f46" }}>/</span>
                <span style={{ color: "#ef4444" }}>
                  {k.losses > 0 ? k.losses : Math.floor(k.trades * (1 - k.wr / 100))}
                </span>
              </div>
              <div style={{ fontSize: 9, color: "#3f3f46" }}>W/L</div>
            </div>

            {/* PnL */}
            <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981", ...MONO }}>{k.pnl}</div>
              {k.solVol > 0 && (
                <div style={{ fontSize: 9, color: "#52525b" }}>{k.solVol.toFixed(2)} SOL live</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. TOKEN TRACKER
// ══════════════════════════════════════════════════════════════════════════════

interface TokenEntry {
  sym:          string;
  mint:         string | undefined;
  buyers:       string[];
  sellers:      string[];
  totalSolBuy:  number;
  totalSolSell: number;
  lastTs:       number;
  kolColors:    string[];
}

function computeTokens(trades: FeedTrade[]): TokenEntry[] {
  const map = new Map<string, TokenEntry>();

  for (const t of trades) {
    const key = t.sym || t.mint || "?";
    if (!map.has(key)) {
      map.set(key, { sym: t.sym, mint: t.mint, buyers: [], sellers: [], totalSolBuy: 0, totalSolSell: 0, lastTs: 0, kolColors: [] });
    }
    const e   = map.get(key)!;
    const ts  = t.ts ?? (Date.now() - t.ago * 1000);
    if (ts > e.lastTs) e.lastTs = ts;
    const sol = parseFloat(t.sol || "0");
    if (t.type === "buy") {
      if (!e.buyers.includes(t.kol))  e.buyers.push(t.kol);
      e.totalSolBuy  += sol;
    } else {
      if (!e.sellers.includes(t.kol)) e.sellers.push(t.kol);
      e.totalSolSell += sol;
    }
    const kol = KOLS.find(k => k.name === t.kol);
    if (kol && !e.kolColors.includes(kol.c)) e.kolColors.push(kol.c);
  }

  return [...map.values()].sort((a, b) => b.buyers.length - a.buyers.length || b.lastTs - a.lastTs);
}

function TokenCard({ entry: e }: { entry: TokenEntry }) {
  const total = e.totalSolBuy + e.totalSolSell;
  const buyPct = total > 0 ? Math.round((e.totalSolBuy / total) * 100) : 100;
  const ageS   = e.lastTs ? Math.floor((Date.now() - e.lastTs) / 1000) : 0;

  return (
    <div style={{
      background: "#0d0d10", border: "1px solid #1e1e21",
      padding: "10px 12px", transition: "border-color .15s",
    }}
      onMouseEnter={el => (el.currentTarget.style.borderColor = "#2a2a30")}
      onMouseLeave={el => (el.currentTarget.style.borderColor = "#1e1e21")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {e.kolColors.slice(0, 4).map((c, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5", ...MONO }}>${e.sym}</span>
          {e.buyers.length >= 3 && (
            <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", background: "#ff2b4e18", color: "#ff2b4e", border: "1px solid #ff2b4e44" }}>HOT</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#3f3f46", ...MONO }}>{ageS > 0 ? fmtAgo(ageS) : "—"}</span>
          {e.mint && (
            <a href={`https://dexscreener.com/solana/${e.mint}`} target="_blank" rel="noreferrer"
              style={{ color: "#3f3f46", display: "flex" }}>
              <IconArrowUpRight size={10} />
            </a>
          )}
        </div>
      </div>

      {/* Buy pressure bar */}
      <div style={{ height: 4, background: "#18181c", marginBottom: 6, overflow: "hidden", borderRadius: 2 }}>
        <div style={{ width: `${buyPct}%`, height: "100%", background: "#22c55e", borderRadius: 2 }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", ...MONO }}>{e.totalSolBuy.toFixed(2)} SOL</div>
            <div style={{ fontSize: 9, color: "#3f3f46" }}>{e.buyers.length} buyer{e.buyers.length !== 1 ? "s" : ""}</div>
          </div>
          {e.totalSolSell > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", ...MONO }}>-{e.totalSolSell.toFixed(2)} SOL</div>
              <div style={{ fontSize: 9, color: "#3f3f46" }}>{e.sellers.length} seller{e.sellers.length !== 1 ? "s" : ""}</div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 9, color: "#52525b", textAlign: "right" }}>
          {e.buyers.slice(0, 3).join(", ")}{e.buyers.length > 3 ? ` +${e.buyers.length - 3}` : ""}
        </div>
      </div>
    </div>
  );
}

function TokenTracker({ trades }: { trades: FeedTrade[] }) {
  const tokens = useMemo(() => computeTokens(trades), [trades]);
  const hot    = tokens.filter(t => t.buyers.length >= 3);
  const active = tokens.filter(t => t.buyers.length === 2);
  const fresh  = tokens.filter(t => t.buyers.length === 1);

  if (tokens.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46" }}>
        <IconTrendingUp size={28} style={{ display: "block", margin: "0 auto 12px", opacity: 0.2 }} />
        <div style={{ fontSize: 11 }}>Waiting for live KOL trades…</div>
      </div>
    );
  }

  const groups = [
    { tier: "hot",    color: "#ff2b4e", label: "🔥 Hot (3+ KOLs)",    items: hot    },
    { tier: "active", color: "#f97316", label: "⚡ Active (2 KOLs)",  items: active },
    { tier: "new",    color: "#22c55e", label: "🆕 New (1 KOL)",       items: fresh  },
  ] as const;

  return (
    <div>
      <div style={{ fontSize: 10, color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
        Realtime Token Tracker · {tokens.length} tokens
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, alignItems: "start" }}>
        {groups.map(g => g.items.length > 0 && (
          <div key={g.tier}>
            <div style={{
              fontSize: 10, fontWeight: 700, marginBottom: 8, padding: "3px 8px",
              background: `${g.color}14`, color: g.color, border: `1px solid ${g.color}33`,
              display: "inline-block",
            }}>
              {g.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {g.items.slice(0, 8).map(t => (
                <TokenCard key={t.sym + (t.mint ?? "")} entry={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. LIVE TRADES
// ══════════════════════════════════════════════════════════════════════════════

function TradeRow({ t, compact = false }: { t: FeedTrade; compact?: boolean }) {
  const isBuy = t.type === "buy";
  const kol   = KOLS.find(k => k.name === t.kol);
  const c     = kol?.c ?? "#52525b";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: compact ? 5 : 10,
      padding: compact ? "5px 12px" : "8px 14px",
      borderBottom: "1px solid #0e0e12",
    }}>
      {!compact && (
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: `${c}1a`, border: `1px solid ${c}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, fontWeight: 800, color: c,
        }}>
          {t.kol.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span style={{
        fontSize: 8, fontWeight: 700, padding: "2px 5px", flexShrink: 0,
        background: isBuy ? "#22c55e18" : "#ef444418",
        color: isBuy ? "#22c55e" : "#ef4444",
        border: `1px solid ${isBuy ? "#22c55e44" : "#ef444444"}`,
      }}>
        {isBuy ? "BUY" : "SELL"}
      </span>
      <span style={{ fontWeight: 700, color: "#f4f4f5", ...MONO, fontSize: 11, flexShrink: 0 }}>${t.sym}</span>
      <span style={{ color: "#71717a", flex: 1, textAlign: "right", fontSize: 10 }}>
        {t.sol} <span style={{ color: "#3f3f46" }}>SOL</span>
      </span>
      <span style={{ color: "#3f3f46", flexShrink: 0, ...MONO, fontSize: 9 }}>{fmtAgo(t.ago < 1 ? 0 : t.ago)}</span>
      {t.mint && (
        <a href={`https://dexscreener.com/solana/${t.mint}`} target="_blank" rel="noreferrer"
          style={{ color: "#3f3f46", display: "flex", flexShrink: 0 }}>
          <IconArrowUpRight size={9} />
        </a>
      )}
    </div>
  );
}

function LiveTradesPanel({ trades }: { trades: FeedTrade[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const displayed = filter ? trades.filter(t => t.kol === filter) : trades;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="live-dot" style={{ background: "#22c55e" }} />
          <span style={{ fontSize: 10, color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Realtime Trades · {displayed.length}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Filter pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => setFilter(null)} style={{
            ...MONO, fontSize: 9, fontWeight: !filter ? 700 : 500, padding: "3px 9px",
            cursor: "pointer", color: !filter ? "#ff2b4e" : "#52525b",
            background: !filter ? "#ff2b4e14" : "transparent",
            border: `1px solid ${!filter ? "#ff2b4e" : "#27272a"}`,
          }}>All KOLs</button>
          {KOLS.map(k => (
            <button key={k.name} onClick={() => setFilter(k.name === filter ? null : k.name)} style={{
              ...MONO, fontSize: 9, fontWeight: filter === k.name ? 700 : 500, padding: "3px 9px",
              cursor: "pointer", color: filter === k.name ? k.c : "#52525b",
              background: filter === k.name ? `${k.c}18` : "transparent",
              border: `1px solid ${filter === k.name ? k.c : "#27272a"}`,
            }}>{k.name}</button>
          ))}
        </div>
      </div>

      {filter ? (
        // Single KOL — list view
        <div>
          {displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#3f3f46", fontSize: 11 }}>
              No trades from {filter} yet
            </div>
          ) : (
            <div style={{ background: "#0d0d10", border: "1px solid #1e1e21" }}>
              {displayed.slice(0, 30).map(t => <TradeRow key={t.id} t={t} />)}
            </div>
          )}
        </div>
      ) : (
        // All KOLs — wallet card grid
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {KOLS.map(k => {
            const kolTrades = trades.filter(t => t.kol === k.name).slice(0, 5);
            return (
              <div key={k.addr} style={{
                background: "#0d0d10",
                border: `1px solid ${k.c}22`,
                transition: "border-color .15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${k.c}55`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = `${k.c}22`)}
              >
                {/* Card header */}
                <div style={{
                  padding: "10px 12px", borderBottom: "1px solid #111114",
                  display: "flex", alignItems: "center", gap: 8,
                  background: `${k.c}08`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `${k.c}1a`, border: `1px solid ${k.c}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800, color: k.c,
                  }}>
                    {k.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: k.c, ...MONO }}>{k.name}</div>
                    <div style={{ fontSize: 9, color: "#3f3f46" }}>WR {k.wr}% · {k.pnl}</div>
                  </div>
                  <a href={`https://solscan.io/account/${k.addr}`} target="_blank" rel="noreferrer"
                    style={{ color: "#3f3f46", display: "flex" }}>
                    <IconArrowUpRight size={10} />
                  </a>
                </div>

                {/* Recent trades */}
                <div style={{ padding: "4px 0" }}>
                  {kolTrades.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: 10, color: "#27272a", textAlign: "center" }}>
                      No recent trades
                    </div>
                  ) : (
                    kolTrades.map(t => <TradeRow key={t.id} t={t} compact />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════

type KolTab = "leaderboard" | "tokens" | "trades";

export function KolScanPanel() {
  const trades = useKolFeed();
  const [kolTab, setKolTab] = useState<KolTab>("leaderboard");

  const tabs: { id: KolTab; label: string; badge?: string }[] = [
    { id: "leaderboard", label: "Leaderboard" },
    { id: "tokens",      label: "Token Tracker", badge: "LIVE" },
    { id: "trades",      label: "Live Trades",   badge: "LIVE" },
  ];

  return (
    <div style={MONO}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 8, margin: 0, marginBottom: 3 }}>
          <IconRocket size={16} style={{ color: "#ff2b4e" }} />
          KOL Scan
        </h2>
        <p style={{ fontSize: 11, color: "#3f3f46", margin: 0 }}>
          Leaderboard · Token tracking · Live trades · {KOLS.length} tracked wallets
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e1e21", marginBottom: 18 }}>
        {tabs.map(t => (
          <SubTab key={t.id} label={t.label} active={kolTab === t.id}
            onClick={() => setKolTab(t.id)} badge={t.badge} />
        ))}
      </div>

      {kolTab === "leaderboard" && <KolLeaderboard trades={trades} />}
      {kolTab === "tokens"      && <TokenTracker   trades={trades} />}
      {kolTab === "trades"      && <LiveTradesPanel trades={trades} />}
    </div>
  );
}
