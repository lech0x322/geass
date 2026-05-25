"use client";

import React from "react";
import { KOLS } from "@/lib/config";
import type { FeedTrade } from "@/lib/types";
import type { TrendingToken, MemeSignal } from "@/lib/api";
import { IconBroadcast, IconFlame, IconZap, IconRocket, IconSolana, IconArrowUpRight, IconCrown, IconTarget, IconActivity } from "./icons";

const CARD: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #1e1e21",
  borderRadius: 14,
  padding: "16px 14px",
};

const fmtAge = (ago: number) => {
  if (ago < 60)    return `${ago}s`;
  if (ago < 3600)  return `${Math.floor(ago / 60)}m`;
  return `${Math.floor(ago / 3600)}h`;
};

const fmtVol = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;

const fmtMc = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;

interface Props {
  solPrice: number | null;
  solChange: number;
  feedTrades: FeedTrade[];
  trendingTokens: TrendingToken[];
  memeSignals: MemeSignal[];
  trendingLoading: boolean;
  isMobile: boolean;
  onNavigate: (tab: string) => void;
}

export function HomeTab({ solPrice, solChange, feedTrades, trendingTokens, memeSignals, trendingLoading, isMobile, onNavigate }: Props) {
  const recentTrades   = feedTrades.slice(0, 6);
  const topMemecoins   = [...trendingTokens].sort((a, b) => b.boostAmount - a.boostAmount).slice(0, 5);
  const topMemeSignals = [...memeSignals].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Hero */}
      <div style={{ position: "relative", background: "linear-gradient(135deg,#0f0c1a,#130a10)", border: "1px solid #27272a", borderRadius: 16, padding: isMobile ? "18px 16px" : "24px 24px", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#ef4444,#f97316,#eab308)" }} />
        <div style={{ position: "absolute", bottom: -40, right: -20, width: 160, height: 160, borderRadius: "50%", background: "#ef444408", filter: "blur(40px)" }} />
        <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: "2px", marginBottom: 6 }}>● GEASS ALPHA RECON</div>
        <h1 style={{ fontSize: isMobile ? 19 : 26, fontWeight: 900, color: "#f4f4f5", letterSpacing: "-.5px", marginBottom: 6, lineHeight: 1.1 }}>
          Meme Intel.<br />
          <span style={{ background: "linear-gradient(90deg,#ef4444,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Before Everyone.</span>
        </h1>
        <p style={{ fontSize: 11, color: "#52525b", marginBottom: 16, lineHeight: 1.6, maxWidth: 380 }}>
          Real-time KOL tracking, meme scanner &amp; alpha signals — all in one terminal.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onNavigate("trades")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <IconBroadcast size={11} /> Live KOL Feed
          </button>
          <button onClick={() => onNavigate("gems")} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <IconZap size={11} /> Scan Alpha
          </button>
          <button onClick={() => onNavigate("trending")} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <IconFlame size={11} /> Trending
          </button>
        </div>
      </div>

      {/* Market Pulse */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        <div style={{ ...CARD, background: "#0d1219", border: "1px solid #1e3a2f" }}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
            <IconSolana size={9} /> SOL PRICE
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f4f4f5" }}>{solPrice ? `$${solPrice.toFixed(2)}` : "—"}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: solChange >= 0 ? "#10b981" : "#ef4444", marginTop: 2 }}>
            {solChange !== 0 ? `${solChange >= 0 ? "+" : ""}${solChange.toFixed(2)}% 24h` : "—"}
          </div>
        </div>
        <div style={CARD}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5 }}>KOLs TRACKED</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f4f4f5" }}>{KOLS.length}</div>
          <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>Elite wallets</div>
        </div>
        <div style={CARD}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5 }}>LIVE SIGNALS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: feedTrades.length > 0 ? "#10b981" : "#f4f4f5" }}>{feedTrades.length}</div>
          <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>KOL trades</div>
        </div>
        <div style={{ ...CARD, cursor: "pointer" }} onClick={() => onNavigate("launch")}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5 }}>QUICK LAUNCH</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f97316", display: "flex", alignItems: "center", gap: 5 }}>
            <IconRocket size={13} /> Deploy
          </div>
          <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>New Pump.fun token</div>
        </div>
      </div>

      {/* Top Boosted Memecoins */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
            <IconFlame size={13} style={{ color: "#f97316" }} /> Top Boosted Memecoins
            {trendingLoading && <span style={{ fontSize: 9, color: "#52525b" }} className="pulse">Loading…</span>}
          </div>
          <button onClick={() => onNavigate("trending")} style={{ background: "transparent", border: "none", color: "#52525b", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
            View all <IconArrowUpRight size={10} />
          </button>
        </div>
        {topMemecoins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "#3f3f46" }}>
            {trendingLoading ? "Fetching DEX Screener…" : "No data — navigate to Trending first"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,1fr)", gap: 8 }}>
            {topMemecoins.map((t, i) => (
              <a key={t.address} href={t.dexUrl} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? 10 : 6, padding: "10px", background: "#0c0c0e", borderRadius: 10, border: "1px solid #1e1e21" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: isMobile ? 1 : undefined }}>
                  {t.icon
                    ? <img src={t.icon} alt={t.symbol} width={24} height={24} style={{ borderRadius: "50%", flexShrink: 0 }} />
                    : <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#52525b", flexShrink: 0 }}>{i + 1}</div>
                  }
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>${t.symbol}</div>
                    {isMobile && <div style={{ fontSize: 9, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{t.name}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 12 : 2, alignItems: isMobile ? "center" : "flex-start" }}>
                  {t.priceChange24 !== null && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.priceChange24 >= 0 ? "#10b981" : "#ef4444" }}>
                      {t.priceChange24 >= 0 ? "+" : ""}{t.priceChange24.toFixed(1)}%
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: "#f97316", display: "flex", alignItems: "center", gap: 2 }}>
                    <IconFlame size={8} />{t.boostAmount >= 1000 ? `${(t.boostAmount / 1000).toFixed(0)}k` : t.boostAmount}
                  </div>
                  {!isMobile && t.volume24 !== null && (
                    <div style={{ fontSize: 9, color: "#52525b" }}>Vol {fmtVol(t.volume24)}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* KOL Leaderboard + Live Activity */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
              <IconCrown size={13} style={{ color: "#eab308" }} /> Top KOL Traders
            </div>
            <button onClick={() => onNavigate("trades")} style={{ background: "transparent", border: "none", color: "#52525b", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              Full feed <IconArrowUpRight size={10} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {KOLS.map((k, i) => (
              <div key={k.addr} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 6px", borderRadius: 8, background: i % 2 === 0 ? "#0c0c0e" : "transparent" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: k.c + "22", border: `1px solid ${k.c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: k.c, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>{k.name}</div>
                  <div style={{ fontSize: 9, color: "#52525b" }}>@{k.tw} · {k.trades.toLocaleString()} trades</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>{k.pnl}</div>
                  <div style={{ fontSize: 9, color: "#52525b" }}>{k.wr}% WR</div>
                </div>
                <a href={`https://x.com/${k.tw}`} target="_blank" rel="noopener noreferrer" style={{ color: "#27272a", flexShrink: 0 }}><IconArrowUpRight size={10} /></a>
              </div>
            ))}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
              <IconActivity size={13} style={{ color: "#ef4444" }} /> Live KOL Activity
              {feedTrades.length > 0 && <span className="live-dot" style={{ background: "#ef4444" }} />}
            </div>
            <button onClick={() => onNavigate("trades")} style={{ background: "transparent", border: "none", color: "#52525b", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              All trades <IconArrowUpRight size={10} />
            </button>
          </div>
          {recentTrades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#3f3f46", fontSize: 11 }}>Waiting for KOL trades…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {recentTrades.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 6px", borderRadius: 7, background: "#0c0c0e" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.type === "buy" ? "#10b981" : "#ef4444", flexShrink: 0 }} />
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.kolC, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>{t.kol}</span>
                    <span style={{ fontSize: 9, color: t.type === "buy" ? "#10b981" : "#ef4444", marginLeft: 4, fontWeight: 700 }}>{t.type.toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: "#71717a", marginLeft: 4 }}>${t.sym}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#eab308", flexShrink: 0 }}>{t.sol} SOL</span>
                  <span style={{ fontSize: 9, color: "#3f3f46", flexShrink: 0 }}>{fmtAge(t.ago)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meme Signal Alerts */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
            <IconTarget size={13} style={{ color: "#a855f7" }} /> Meme Signal Alerts
            {trendingLoading && <span style={{ fontSize: 9, color: "#52525b" }} className="pulse">Scanning…</span>}
          </div>
          <button onClick={() => onNavigate("trending")} style={{ background: "transparent", border: "none", color: "#52525b", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
            All signals <IconArrowUpRight size={10} />
          </button>
        </div>
        {topMemeSignals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "#3f3f46" }}>
            {trendingLoading ? "Scanning pump.fun…" : "No signals yet — check back soon"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,1fr)", gap: 8 }}>
            {topMemeSignals.map(s => {
              const sc = s.score >= 80 ? "#10b981" : s.score >= 60 ? "#eab308" : "#f97316";
              return (
                <a key={s.address} href={s.pumpUrl} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 10 : 6, padding: "10px", background: "#0c0c0e", borderRadius: 10, border: `1px solid ${sc}20` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: isMobile ? 1 : undefined }}>
                    {s.icon
                      ? <img src={s.icon} alt={s.symbol} width={22} height={22} style={{ borderRadius: "50%", flexShrink: 0 }} />
                      : <div style={{ width: 22, height: 22, borderRadius: "50%", background: sc + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: sc, flexShrink: 0 }}>{s.symbol.slice(0, 2)}</div>
                    }
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>${s.symbol}</div>
                      {isMobile && <div style={{ fontSize: 9, color: "#52525b" }}>{s.name}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 10 : 3 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: sc }}>{s.score}<span style={{ fontSize: 8, color: "#52525b" }}>/100</span></div>
                    {s.marketCap != null && <div style={{ fontSize: 9, color: "#52525b" }}>MC {fmtMc(s.marketCap)}</div>}
                    {s.volume1h != null && <div style={{ fontSize: 9, color: "#3f3f46" }}>Vol {fmtVol(s.volume1h)}</div>}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Nav */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
        {([
          { id: "trending", icon: <IconFlame size={15} />, label: "Trending", desc: "Boosted Solana tokens", color: "#f97316" },
          { id: "launch",   icon: <IconRocket size={15} />, label: "Launch Token", desc: "Deploy on Pump.fun", color: "#3b82f6" },
          { id: "gems",     icon: <IconZap size={15} />, label: "Alpha Scanner", desc: "Find the next gem", color: "#a855f7" },
        ] as const).map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            style={{ ...CARD, cursor: "pointer", textAlign: "left", border: `1px solid ${item.color}22`, background: `${item.color}08`, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ color: item.color }}>{item.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>{item.label}</div>
            <div style={{ fontSize: 10, color: "#52525b" }}>{item.desc}</div>
          </button>
        ))}
      </div>

    </div>
  );
}
