"use client";

import React from "react";
import { KOLS } from "@/lib/config";
import type { FeedTrade } from "@/lib/types";
import type { TrendingToken, MemeSignal, XSignal } from "@/lib/api";
import { IconBroadcast, IconFlame, IconZap, IconRocket, IconSolana, IconArrowUpRight, IconCrown, IconTarget, IconActivity } from "./icons";

const CARD: React.CSSProperties = {
  background: "#0f0f16",
  border: "1px solid #1e1e2e",
  borderRadius: 16,
  padding: "20px",
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
  xSignals: XSignal[];
  trendingLoading: boolean;
  isMobile: boolean;
  onNavigate: (tab: string) => void;
}

export function HomeTab({ solPrice, solChange, feedTrades, trendingTokens, memeSignals, xSignals, trendingLoading, isMobile, onNavigate }: Props) {
  const recentTrades   = feedTrades.slice(0, 6);
  const topMemecoins   = [...trendingTokens].sort((a, b) => b.boostAmount - a.boostAmount).slice(0, 5);
  const topMemeSignals = [...memeSignals].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero */}
      <div style={{ position: "relative", background: "linear-gradient(135deg,#0a0612,#0c0810,#0f0c1a)", border: "1px solid #1e1e2e", borderRadius: 16, padding: isMobile ? "22px 18px" : "28px 28px", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#f43f5e,#f97316,#eab308)" }} />
        <div style={{ position: "absolute", bottom: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "#f43f5e06", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: -40, right: 60, width: 140, height: 140, borderRadius: "50%", background: "#8b5cf606", filter: "blur(50px)" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, color: "#f43f5e", fontWeight: 700, letterSpacing: "2.5px", marginBottom: 10, background: "#f43f5e12", border: "1px solid #f43f5e30", padding: "3px 10px", borderRadius: 20 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f43f5e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
          GEASS ALPHA RECON
        </div>
        <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-.5px", marginBottom: 8, lineHeight: 1.1 }}>
          <span style={{ background: "linear-gradient(90deg,#f43f5e,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Meme Intel.</span><br />
          <span style={{ color: "#94a3b8", fontSize: isMobile ? 17 : 22, fontWeight: 700 }}>Before Everyone.</span>
        </h1>
        <p style={{ fontSize: 12, color: "#475569", marginBottom: 20, lineHeight: 1.7, maxWidth: 400 }}>
          Real-time KOL tracking, meme scanner &amp; alpha signals — all in one terminal.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onNavigate("trades")} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f43f5e,#e11d48)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 4px 16px rgba(244,63,94,0.35)" }}>
            <IconBroadcast size={11} /> Live KOL Feed
          </button>
          <button onClick={() => onNavigate("gems")} style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid #2d2d42", background: "#0a0a0f", color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <IconZap size={11} /> Scan Alpha
          </button>
          <button onClick={() => onNavigate("trending")} style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid #2d2d42", background: "#0a0a0f", color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <IconFlame size={11} /> Trending
          </button>
        </div>
      </div>

      {/* Market Pulse */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12 }}>
        {/* SOL Price */}
        <div style={{ ...CARD, background: "#0f0f16", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#10b981,#059669)", borderRadius: "16px 16px 0 0" }} />
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "1.5px", marginBottom: 8, display: "flex", alignItems: "center", gap: 4, paddingTop: 4 }}>
            <IconSolana size={9} /> SOL PRICE
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{solPrice ? `$${solPrice.toFixed(2)}` : "—"}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: solChange >= 0 ? "#10b981" : "#f43f5e", marginTop: 3 }}>
            {solChange !== 0 ? `${solChange >= 0 ? "+" : ""}${solChange.toFixed(2)}% 24h` : "—"}
          </div>
        </div>
        {/* KOLs Tracked */}
        <div style={{ ...CARD, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#f59e0b,#d97706)", borderRadius: "16px 16px 0 0" }} />
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "1.5px", marginBottom: 8, paddingTop: 4 }}>KOLs TRACKED</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{KOLS.length}</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>Elite wallets</div>
        </div>
        {/* Live Signals */}
        <div style={{ ...CARD, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: feedTrades.length > 0 ? "linear-gradient(90deg,#f43f5e,#e11d48)" : "linear-gradient(90deg,#1e1e2e,#2d2d42)", borderRadius: "16px 16px 0 0" }} />
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "1.5px", marginBottom: 8, paddingTop: 4 }}>LIVE SIGNALS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedTrades.length > 0 ? "#10b981" : "#f1f5f9" }}>{feedTrades.length}</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>KOL trades</div>
        </div>
        {/* Quick Launch */}
        <div style={{ ...CARD, cursor: "pointer", position: "relative", overflow: "hidden" }} onClick={() => onNavigate("launch")}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#3b82f6,#2563eb)", borderRadius: "16px 16px 0 0" }} />
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "1.5px", marginBottom: 8, paddingTop: 4 }}>QUICK LAUNCH</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6", display: "flex", alignItems: "center", gap: 5 }}>
            <IconRocket size={14} /> Launch
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>New Pump.fun token</div>
        </div>
      </div>

      {/* Top Boosted Memecoins */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 7 }}>
            <IconFlame size={14} style={{ color: "#f97316" }} />
            <span style={{ background: "linear-gradient(90deg,#f97316,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Top Boosted</span>
            <span style={{ color: "#f1f5f9" }}>Memecoins</span>
            {trendingLoading && <span style={{ fontSize: 9, color: "#475569" }} className="pulse">Loading…</span>}
          </div>
          <button onClick={() => onNavigate("trending")} style={{ background: "transparent", border: "none", color: "#475569", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, transition: "color 0.15s" }}>
            View all <IconArrowUpRight size={10} />
          </button>
        </div>
        {topMemecoins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>🔥</div>
            {trendingLoading ? "Fetching DEX Screener…" : "No data — navigate to Trending first"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,1fr)", gap: 10 }}>
            {topMemecoins.map((t, i) => (
              <a key={t.address} href={t.dexUrl} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? 10 : 8, padding: "12px 10px", background: "#0a0a0f", borderRadius: 12, border: "1px solid #1e1e2e", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2d2d42"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#1e1e2e"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: isMobile ? 1 : undefined }}>
                  {t.icon
                    ? <img src={t.icon} alt={t.symbol} width={26} height={26} style={{ borderRadius: "50%", flexShrink: 0, border: "1px solid #1e1e2e" }} />
                    : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#151520", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#475569", flexShrink: 0, border: "1px solid #1e1e2e" }}>{i + 1}</div>
                  }
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>${t.symbol}</div>
                    {isMobile && <div style={{ fontSize: 9, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{t.name}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 12 : 3, alignItems: isMobile ? "center" : "flex-start" }}>
                  {t.priceChange24 !== null && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.priceChange24 >= 0 ? "#10b981" : "#f43f5e" }}>
                      {t.priceChange24 >= 0 ? "+" : ""}{t.priceChange24.toFixed(1)}%
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: "#f97316", display: "flex", alignItems: "center", gap: 3, background: "#f9731610", padding: "2px 6px", borderRadius: 6 }}>
                    <IconFlame size={8} />{t.boostAmount >= 1000 ? `${(t.boostAmount / 1000).toFixed(0)}k` : t.boostAmount}
                  </div>
                  {!isMobile && t.volume24 !== null && (
                    <div style={{ fontSize: 9, color: "#475569" }}>Vol {fmtVol(t.volume24)}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* KOL Leaderboard + Live Activity */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        {/* KOL Leaderboard */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 7 }}>
              <IconCrown size={14} style={{ color: "#f59e0b" }} />
              <span style={{ background: "linear-gradient(90deg,#f59e0b,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Top KOL</span>
              <span style={{ color: "#f1f5f9" }}>Traders</span>
            </div>
            <button onClick={() => onNavigate("trades")} style={{ background: "transparent", border: "none", color: "#475569", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              Full feed <IconArrowUpRight size={10} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {KOLS.map((k, i) => (
              <div key={k.addr} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 10, background: i % 2 === 0 ? "#0a0a0f" : "transparent", transition: "background 0.15s" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: k.c, width: 14, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `2px solid ${k.c}44`, flexShrink: 0, background: k.c + "15" }}>
                  <img src={`https://unavatar.io/twitter/${k.tw}`} alt={k.name} width={26} height={26} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>{k.name}</div>
                  <div style={{ fontSize: 9, color: "#475569" }}>@{k.tw} · {k.trades.toLocaleString()} trades</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>{k.pnl}</div>
                  <div style={{ fontSize: 9, color: "#475569" }}>{k.wr}% WR</div>
                </div>
                <a href={`https://x.com/${k.tw}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d2d42", flexShrink: 0 }}><IconArrowUpRight size={10} /></a>
              </div>
            ))}
          </div>
        </div>

        {/* Live KOL Activity */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 7 }}>
              <IconActivity size={14} style={{ color: "#f43f5e" }} />
              <span style={{ background: "linear-gradient(90deg,#f43f5e,#fb7185)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Live KOL</span>
              <span style={{ color: "#f1f5f9" }}>Activity</span>
              {feedTrades.length > 0 && <span className="live-dot" style={{ background: "#f43f5e" }} />}
            </div>
            <button onClick={() => onNavigate("trades")} style={{ background: "transparent", border: "none", color: "#475569", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              All trades <IconArrowUpRight size={10} />
            </button>
          </div>
          {recentTrades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "#475569", fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.3 }}>📡</div>
              Waiting for KOL trades…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {recentTrades.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 10, background: "#0a0a0f", borderLeft: `3px solid ${t.type === "buy" ? "#10b981" : "#f43f5e"}` }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.kolC, flexShrink: 0 }} />
                  {t.mint ? (
                    <img
                      src={`https://dd.dexscreener.com/ds-data/tokens/solana/${t.mint}.png`}
                      alt={t.sym}
                      width={18} height={18}
                      style={{ borderRadius: "50%", flexShrink: 0, border: "1px solid #1e1e2e" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>{t.kol}</span>
                    <span style={{ fontSize: 9, color: t.type === "buy" ? "#10b981" : "#f43f5e", marginLeft: 5, fontWeight: 700, textTransform: "uppercase", background: t.type === "buy" ? "#10b98115" : "#f43f5e15", padding: "1px 5px", borderRadius: 4 }}>{t.type}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 5 }}>${t.sym}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", flexShrink: 0 }}>{t.sol} SOL</span>
                  <span style={{ fontSize: 9, color: "#475569", flexShrink: 0 }}>{fmtAge(t.ago)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meme Signal Alerts */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 7 }}>
            <IconTarget size={14} style={{ color: "#8b5cf6" }} />
            <span style={{ background: "linear-gradient(90deg,#8b5cf6,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Meme Signal</span>
            <span style={{ color: "#f1f5f9" }}>Alerts</span>
            {trendingLoading && <span style={{ fontSize: 9, color: "#475569" }} className="pulse">Scanning…</span>}
          </div>
          <button onClick={() => onNavigate("trending")} style={{ background: "transparent", border: "none", color: "#475569", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
            All signals <IconArrowUpRight size={10} />
          </button>
        </div>
        {topMemeSignals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>🎯</div>
            {trendingLoading ? "Scanning pump.fun…" : "No signals yet — check back soon"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,1fr)", gap: 10 }}>
            {topMemeSignals.map(s => {
              const sc = s.score >= 80 ? "#10b981" : s.score >= 60 ? "#f59e0b" : "#f97316";
              return (
                <a key={s.address} href={s.pumpUrl} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 10 : 8, padding: "12px 10px", background: "#0a0a0f", borderRadius: 12, border: `1px solid ${sc}20`, transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = sc + "50"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 32px ${sc}18`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = sc + "20"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flex: isMobile ? 1 : undefined }}>
                    {s.icon
                      ? <img src={s.icon} alt={s.symbol} width={26} height={26} style={{ borderRadius: "50%", flexShrink: 0, border: `1px solid ${sc}30` }} />
                      : <div style={{ width: 26, height: 26, borderRadius: "50%", background: sc + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: sc, flexShrink: 0, border: `1px solid ${sc}30` }}>{s.symbol.slice(0, 2)}</div>
                    }
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>${s.symbol}</div>
                      {isMobile && <div style={{ fontSize: 9, color: "#475569" }}>{s.name}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 10 : 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: sc }}>{s.score}<span style={{ fontSize: 9, color: "#475569" }}>/100</span></div>
                    {s.marketCap != null && <div style={{ fontSize: 9, color: "#475569" }}>MC {fmtMc(s.marketCap)}</div>}
                    {s.volume1h != null && <div style={{ fontSize: 9, color: "#2d2d42" }}>Vol {fmtVol(s.volume1h)}</div>}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Nav */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 12 }}>
        {([
          { id: "trending", icon: <IconFlame size={16} />, label: "Trending", desc: "Boosted Solana tokens", color: "#f97316" },
          { id: "launch",   icon: <IconRocket size={16} />, label: "Launch Token", desc: "Deploy on Pump.fun", color: "#3b82f6" },
          { id: "gems",     icon: <IconZap size={16} />, label: "Alpha Scanner", desc: "Find the next gem", color: "#8b5cf6" },
        ] as const).map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            style={{ ...CARD, cursor: "pointer", textAlign: "left", border: `1px solid ${item.color}25`, background: `${item.color}08`, display: "flex", flexDirection: "column", gap: 7, transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = item.color + "50"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${item.color}15`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = item.color + "25"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
            <div style={{ color: item.color, background: item.color + "15", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{item.label}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{item.desc}</div>
          </button>
        ))}
      </div>

      {/* Latest Memecoin News */}
      {xSignals.length > 0 && (
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Latest Memecoin News</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, color: "#10b981", background: "#10b98115", border: "1px solid #10b98135", padding: "2px 7px", borderRadius: 20 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                LIVE
              </span>
            </div>
            <button onClick={() => onNavigate("trending")} style={{ background: "transparent", border: "none", color: "#475569", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              All news <IconArrowUpRight size={10} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {xSignals.slice(0, 4).map(s => {
              const age = Math.round((Date.now() - s.pubDate) / 60000);
              const ageLabel = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age / 60)}h ago` : `${Math.round(age / 1440)}d ago`;
              return (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#0a0a0f", borderRadius: 10, border: "1px solid #1e1e2e", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2d2d42"; (e.currentTarget as HTMLAnchorElement).style.background = "#151520"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#1e1e2e"; (e.currentTarget as HTMLAnchorElement).style.background = "#0a0a0f"; }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.text}</div>
                    <div style={{ fontSize: 9, color: "#475569", marginTop: 3 }}>{s.author} · {ageLabel}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#2d2d42", flexShrink: 0 }}>↗</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
