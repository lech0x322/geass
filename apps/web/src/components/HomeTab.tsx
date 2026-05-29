"use client";

import React from "react";
import { KOLS } from "@/lib/config";
import { useKolStats } from "@/lib/useKolStats";
import type { FeedTrade } from "@/lib/types";
import type { TrendingToken, MemeSignal, XSignal } from "@/lib/api";
import { IconBroadcast, IconFlame, IconZap, IconRocket, IconSolana, IconArrowUpRight, IconCrown, IconTarget, IconActivity } from "./icons";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";
const RED = "#ff2b4e";

const CARD: React.CSSProperties = {
  background: "#050506",
  border: "1px solid #18181c",
  borderRadius: 0,
  padding: "20px",
  position: "relative",
};

// small mono bracket section heading: [ LABEL ]
const SectionHead = ({ label, color = RED, action, children }: { label: string; color?: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 8, fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: "2.5px", color }}>
        <span style={{ color: "#2a2a30" }}>[</span>
        <span style={{ width: 5, height: 5, background: color, display: "inline-block" }} />
        {label}
        <span style={{ color: "#2a2a30" }}>]</span>
      </div>
      {children}
    </div>
    {action}
  </div>
);

const viewBtn = (onClick: () => void, txt: string): React.ReactNode => (
  <button onClick={onClick} style={{ background: "transparent", border: "1px solid #18181c", color: "#9a9aa2", fontSize: 9, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", fontFamily: MONO, letterSpacing: ".5px" }}>
    {txt} <span style={{ color: RED }}>▸</span>
  </button>
);

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
  const { stats: kolStats, loading: kolStatsLoading } = useKolStats(KOLS.map(k => k.addr));
  // Rank KOLs by real 30d net SOL flow (falls back to config order while loading).
  const rankedKols = [...KOLS].sort((a, b) => (kolStats[b.addr]?.netSol30d ?? 0) - (kolStats[a.addr]?.netSol30d ?? 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero */}
      <div style={{ position: "relative", background: "#050506", border: "1px solid #18181c", borderRadius: 0, padding: isMobile ? "22px 18px" : "30px 28px", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: RED }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 9, color: RED, fontWeight: 600, letterSpacing: "2.5px", marginBottom: 14, fontFamily: MONO }}>
          <span style={{ color: "#2a2a30" }}>[</span>
          <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: RED, animation: "pulse 1.6s infinite" }} />
            <span style={{ position: "relative", display: "block", width: 6, height: 6, borderRadius: "50%", background: RED }} />
          </span>
          GEASS_ALPHA_RECON
          <span style={{ color: "#2a2a30" }}>]</span>
        </div>
        <h1 style={{ fontSize: isMobile ? 24 : 34, fontWeight: 800, color: "#f5f5f7", letterSpacing: "-1.5px", marginBottom: 10, lineHeight: 1.02, textTransform: "uppercase" }}>
          <span style={{ color: RED }}>Meme Intel.</span><br />
          <span style={{ color: "#9a9aa2", fontSize: isMobile ? 18 : 24, fontWeight: 800 }}>Before Everyone.</span>
        </h1>
        <p style={{ fontSize: 12, color: "#5a5a63", marginBottom: 22, lineHeight: 1.7, maxWidth: 400, fontFamily: MONO }}>
          Real-time KOL tracking, meme scanner &amp; alpha signals — all in one terminal.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onNavigate("trades")} style={{ padding: "11px 20px", borderRadius: 0, border: `1px solid ${RED}`, background: RED, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, letterSpacing: ".5px" }}>
            <IconBroadcast size={11} /> LIVE KOL FEED ▸
          </button>
          <button onClick={() => onNavigate("gems")} style={{ padding: "11px 20px", borderRadius: 0, border: "1px solid #18181c", background: "transparent", color: "#9a9aa2", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, letterSpacing: ".5px" }}>
            <IconZap size={11} /> SCAN ALPHA
          </button>
          <button onClick={() => onNavigate("trending")} style={{ padding: "11px 20px", borderRadius: 0, border: "1px solid #18181c", background: "transparent", color: "#9a9aa2", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, letterSpacing: ".5px" }}>
            <IconFlame size={11} /> TRENDING
          </button>
        </div>
      </div>

      {/* Market Pulse */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 1, background: "#18181c", border: "1px solid #18181c" }}>
        {/* SOL Price */}
        <div style={{ background: "#050506", padding: "20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#10b981" }} />
          <div style={{ fontSize: 9, color: "#5a5a63", letterSpacing: "1.5px", marginBottom: 10, display: "flex", alignItems: "center", gap: 5, fontFamily: MONO }}>
            <IconSolana size={9} /> SOL_PRICE
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f5f5f7", fontFamily: MONO, letterSpacing: "-1px" }}>{solPrice ? `$${solPrice.toFixed(2)}` : "—"}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: solChange >= 0 ? "#10b981" : RED, marginTop: 4, fontFamily: MONO }}>
            {solChange !== 0 ? `${solChange >= 0 ? "+" : ""}${solChange.toFixed(2)}% 24h` : "—"}
          </div>
        </div>
        {/* KOLs Tracked */}
        <div style={{ background: "#050506", padding: "20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#f59e0b" }} />
          <div style={{ fontSize: 9, color: "#5a5a63", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>KOLS_TRACKED</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f5f5f7", fontFamily: MONO, letterSpacing: "-1px" }}>{KOLS.length}</div>
          <div style={{ fontSize: 10, color: "#5a5a63", marginTop: 4, fontFamily: MONO }}>elite wallets</div>
        </div>
        {/* Live Signals */}
        <div style={{ background: "#050506", padding: "20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: feedTrades.length > 0 ? RED : "#2a2a30" }} />
          <div style={{ fontSize: 9, color: "#5a5a63", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>LIVE_SIGNALS</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: feedTrades.length > 0 ? "#10b981" : "#f5f5f7", fontFamily: MONO, letterSpacing: "-1px" }}>{feedTrades.length}</div>
          <div style={{ fontSize: 10, color: "#5a5a63", marginTop: 4, fontFamily: MONO }}>kol trades</div>
        </div>
        {/* Quick Launch */}
        <div style={{ background: "#050506", padding: "20px", cursor: "pointer", position: "relative", overflow: "hidden" }} onClick={() => onNavigate("launch")}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#3b82f6" }} />
          <div style={{ fontSize: 9, color: "#5a5a63", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>QUICK_LAUNCH</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#3b82f6", display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, letterSpacing: "-.5px" }}>
            <IconRocket size={14} /> LAUNCH ▸
          </div>
          <div style={{ fontSize: 10, color: "#5a5a63", marginTop: 4, fontFamily: MONO }}>new pump.fun token</div>
        </div>
      </div>

      {/* Top Boosted Memecoins */}
      <div style={CARD}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#f59e0b" }} />
        <SectionHead label="TOP_BOOSTED" color="#f59e0b" action={viewBtn(() => onNavigate("trending"), "VIEW ALL")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#f5f5f7", letterSpacing: "-.5px", textTransform: "uppercase" }}>
            <IconFlame size={14} style={{ color: "#f59e0b" }} /> Boosted Memecoins
            {trendingLoading && <span style={{ fontSize: 9, color: "#5a5a63", fontFamily: MONO }} className="pulse">LOADING…</span>}
          </div>
        </SectionHead>
        {topMemecoins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", fontSize: 11, color: "#5a5a63", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: MONO }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>🔥</div>
            {trendingLoading ? "FETCHING DEX SCREENER…" : "NO DATA — NAVIGATE TO TRENDING FIRST"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,1fr)", gap: 1, background: "#18181c", border: "1px solid #18181c" }}>
            {topMemecoins.map((t, i) => (
              <a key={t.address} href={t.dexUrl} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? 10 : 8, padding: "12px 12px", background: "#050506", borderRadius: 0, transition: "background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#0d0d10"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#050506"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: isMobile ? 1 : undefined }}>
                  {t.icon
                    ? <img src={t.icon} alt={t.symbol} width={26} height={26} style={{ borderRadius: "50%", flexShrink: 0, border: "1px solid #18181c" }} />
                    : <div style={{ width: 26, height: 26, borderRadius: 0, background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#5a5a63", flexShrink: 0, border: "1px solid #18181c", fontFamily: MONO }}>{i + 1}</div>
                  }
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#f5f5f7", fontFamily: MONO }}>${t.symbol}</div>
                    {isMobile && <div style={{ fontSize: 9, color: "#5a5a63", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120, fontFamily: MONO }}>{t.name}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 12 : 3, alignItems: isMobile ? "center" : "flex-start" }}>
                  {t.priceChange24 !== null && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.priceChange24 >= 0 ? "#10b981" : RED, fontFamily: MONO }}>
                      {t.priceChange24 >= 0 ? "+" : ""}{t.priceChange24.toFixed(1)}%
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: "#f59e0b", display: "flex", alignItems: "center", gap: 3, border: "1px solid #f59e0b35", padding: "2px 6px", borderRadius: 0, fontFamily: MONO }}>
                    <IconFlame size={8} />{t.boostAmount >= 1000 ? `${(t.boostAmount / 1000).toFixed(0)}k` : t.boostAmount}
                  </div>
                  {!isMobile && t.volume24 !== null && (
                    <div style={{ fontSize: 9, color: "#5a5a63", fontFamily: MONO }}>VOL {fmtVol(t.volume24)}</div>
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
            {rankedKols.map((k, i) => {
              const s = kolStats[k.addr];
              const net = s?.netSol30d;
              const netColor = net === undefined ? "#475569" : net >= 0 ? "#10b981" : "#ef4444";
              return (
              <div key={k.addr} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 10, background: i % 2 === 0 ? "#0a0a0f" : "transparent", transition: "background 0.15s" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: k.c, width: 14, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `2px solid ${k.c}44`, flexShrink: 0, background: k.c + "15" }}>
                  <img src={`https://unavatar.io/twitter/${k.tw}`} alt={k.name} width={26} height={26} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>{k.name}</div>
                  <div style={{ fontSize: 9, color: "#475569" }}>
                    @{k.tw} · {kolStatsLoading && !s ? "…" : `${(s?.swaps30d ?? 0).toLocaleString()} swaps (30d)`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: netColor }}>
                    {kolStatsLoading && !s ? "—" : net === undefined ? "—" : `${net >= 0 ? "+" : ""}${net.toFixed(1)} SOL`}
                  </div>
                  <div style={{ fontSize: 9, color: "#475569" }}>net 30d</div>
                </div>
                <a href={`https://x.com/${k.tw}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d2d42", flexShrink: 0 }}><IconArrowUpRight size={10} /></a>
              </div>
            );})}
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
