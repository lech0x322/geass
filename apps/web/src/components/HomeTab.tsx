"use client";

import React from "react";
import { KOLS } from "@/lib/config";
import type { FeedTrade } from "@/lib/types";
import { IconBroadcast, IconFlame, IconZap, IconRocket, IconSolana, IconArrowUpRight, IconCrown } from "./icons";

const CARD: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #1e1e21",
  borderRadius: 14,
  padding: "16px 14px",
};

const fmtAge = (ago: number) => {
  if (ago < 60)    return `${ago}s ago`;
  if (ago < 3600)  return `${Math.floor(ago / 60)}m ago`;
  return `${Math.floor(ago / 3600)}h ago`;
};

interface Props {
  solPrice: number | null;
  solChange: number;
  feedTrades: FeedTrade[];
  isMobile: boolean;
  onNavigate: (tab: string) => void;
}

export function HomeTab({ solPrice, solChange, feedTrades, isMobile, onNavigate }: Props) {
  const recentTrades = feedTrades.slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero banner */}
      <div style={{ position: "relative", background: "linear-gradient(135deg,#0f0c1a,#130a10)", border: "1px solid #27272a", borderRadius: 16, padding: isMobile ? "20px 16px" : "28px 24px", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#ef4444,#f97316,#eab308)" }} />
        <div style={{ position: "absolute", bottom: -40, right: -20, width: 180, height: 180, borderRadius: "50%", background: "#ef444408", filter: "blur(40px)" }} />
        <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: "2px", marginBottom: 8 }}>● GEASS ALPHA RECON</div>
        <h1 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: "#f4f4f5", letterSpacing: "-.5px", marginBottom: 8, lineHeight: 1.1 }}>
          Meme Intel.<br />
          <span style={{ background: "linear-gradient(90deg,#ef4444,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Before Everyone.</span>
        </h1>
        <p style={{ fontSize: 11, color: "#52525b", marginBottom: 20, lineHeight: 1.6, maxWidth: 400 }}>
          Real-time KOL tracking, meme scanner &amp; alpha signals — all in one terminal.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onNavigate("trades")}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IconBroadcast size={12} /> Live KOL Feed
          </button>
          <button onClick={() => onNavigate("gems")}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IconZap size={12} /> Scan Alpha
          </button>
          <button onClick={() => onNavigate("trending")}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IconFlame size={12} /> Trending
          </button>
        </div>
      </div>

      {/* SOL price + quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        <div style={{ ...CARD, background: "#0d1219", border: "1px solid #1e3a2f" }}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <IconSolana size={9} /> SOL PRICE
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f4f4f5" }}>
            {solPrice ? `$${solPrice.toFixed(2)}` : "—"}
          </div>
          {solChange !== 0 && (
            <div style={{ fontSize: 10, fontWeight: 600, color: solChange >= 0 ? "#10b981" : "#ef4444", marginTop: 2 }}>
              {solChange >= 0 ? "+" : ""}{solChange.toFixed(2)}% 24h
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 6 }}>KOLs TRACKED</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f4f4f5" }}>{KOLS.length}</div>
          <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>Elite wallets</div>
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 6 }}>LIVE SIGNALS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: feedTrades.length > 0 ? "#10b981" : "#f4f4f5" }}>{feedTrades.length}</div>
          <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>Trades detected</div>
        </div>

        <div style={{ ...CARD, cursor: "pointer" }} onClick={() => onNavigate("launch")}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 6 }}>QUICK ACTION</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f97316", display: "flex", alignItems: "center", gap: 5 }}>
            <IconRocket size={14} /> Launch
          </div>
          <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>Pump.fun token</div>
        </div>
      </div>

      {/* Two-column: KOL leaderboard + live activity */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>

        {/* Top KOL Traders */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
              <IconCrown size={13} style={{ color: "#eab308" }} /> Top KOL Traders
            </div>
            <button onClick={() => onNavigate("trades")}
              style={{ background: "transparent", border: "none", color: "#52525b", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              View all <IconArrowUpRight size={10} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {KOLS.map((k, i) => (
              <div key={k.addr} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, background: i % 2 === 0 ? "#0c0c0e" : "transparent" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: k.c + "22", border: `1px solid ${k.c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: k.c, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>{k.name}</div>
                  <div style={{ fontSize: 9, color: "#52525b" }}>@{k.tw}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{k.pnl}</div>
                  <div style={{ fontSize: 9, color: "#52525b" }}>{k.wr}% WR</div>
                </div>
                <a href={`https://x.com/${k.tw}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#27272a", flexShrink: 0 }}>
                  <IconArrowUpRight size={11} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Recent KOL trades */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
              <IconBroadcast size={13} style={{ color: "#ef4444" }} /> Recent KOL Activity
              {feedTrades.length > 0 && <span className="live-dot" style={{ background: "#ef4444" }} />}
            </div>
            <button onClick={() => onNavigate("trades")}
              style={{ background: "transparent", border: "none", color: "#52525b", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              Full feed <IconArrowUpRight size={10} />
            </button>
          </div>

          {recentTrades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#3f3f46", fontSize: 11 }}>
              Waiting for KOL trades…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recentTrades.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 6px", borderRadius: 7, background: "#0c0c0e" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.type === "buy" ? "#10b981" : "#ef4444", flexShrink: 0 }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.kolC, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>{t.kol}</span>
                    <span style={{ fontSize: 10, color: t.type === "buy" ? "#10b981" : "#ef4444", marginLeft: 5, fontWeight: 600 }}>
                      {t.type.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: "#a1a1aa", marginLeft: 5 }}>${t.sym}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#eab308", flexShrink: 0 }}>{t.sol} SOL</div>
                  <div style={{ fontSize: 9, color: "#3f3f46", flexShrink: 0 }}>{fmtAge(t.ago)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick nav shortcuts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
        {([
          { id: "trending", icon: <IconFlame size={16} />, label: "Trending", desc: "Boosted Solana tokens", color: "#f97316" },
          { id: "launch",   icon: <IconRocket size={16} />, label: "Launch Token", desc: "Deploy on Pump.fun", color: "#3b82f6" },
          { id: "gems",     icon: <IconZap size={16} />, label: "Alpha Scanner", desc: "Find the next gem", color: "#a855f7" },
        ] as const).map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            style={{ ...CARD, cursor: "pointer", textAlign: "left", border: `1px solid ${item.color}22`, background: `${item.color}08`, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ color: item.color }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>{item.label}</div>
            <div style={{ fontSize: 10, color: "#52525b" }}>{item.desc}</div>
          </button>
        ))}
      </div>

    </div>
  );
}
