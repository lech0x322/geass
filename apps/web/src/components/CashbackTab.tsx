"use client";

import React, { useEffect, useState, useCallback } from "react";
import { IconSolana, IconRefresh, IconCheck } from "./icons";

interface CashbackStats {
  unclaimed: number;
  totalClaimed: number;
  tradeCount: number;
  cashbackRate: number;
  minClaimSol: number;
}

interface Props {
  wallet: string;
  isMobile?: boolean;
}

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";

export function CashbackTab({ wallet, isMobile }: Props) {
  const [stats, setStats]     = useState<CashbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/cashback?wallet=${encodeURIComponent(wallet)}`);
      const d = await r.json();
      setStats(d);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { load(); }, [load]);

  const claim = async () => {
    if (!stats || claiming) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const r = await fetch("/api/cashback/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const d = await r.json();
      if (!r.ok || d.error) {
        setClaimMsg({ ok: false, text: d.error ?? "Claim failed" });
      } else {
        setClaimMsg({ ok: true, text: `Claimed ${d.claimedSol.toFixed(4)} SOL! TX: ${d.signature.slice(0, 16)}…` });
        setJustClaimed(true);
        setTimeout(() => setJustClaimed(false), 4000);
        await load();
      }
    } catch (e) {
      setClaimMsg({ ok: false, text: e instanceof Error ? e.message : "Network error" });
    } finally {
      setClaiming(false);
    }
  };

  const canClaim = stats ? stats.unclaimed >= (stats.minClaimSol ?? 0.05) : false;
  const pct = (stats?.cashbackRate ?? 0.005) * 100;

  const shortAddr = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

  return (
    <div style={{ padding: isMobile ? "14px 14px 80px" : "28px 32px", maxWidth: 560, fontFamily: MONO }}>

      {/* Header card */}
      <div style={{
        background: "#070708", border: "1px solid #18181c",
        padding: isMobile ? "20px 16px" : "26px 24px",
        marginBottom: 2, position: "relative", overflow: "hidden",
      }}>
        {/* Top accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#ff2b4e,#ff2b4e80,transparent)" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {/* Coin icon */}
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>
                ◎
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5", letterSpacing: "0.02em" }}>Cashback</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "#ff2b4e",
                    border: "1px solid #ff2b4e50", padding: "2px 6px",
                    letterSpacing: "1.5px",
                  }}>NEW</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b6b7a", marginTop: 2 }}>
                  Earn SOL back from trading on Solana
                </div>
              </div>
            </div>
          </div>

          {/* Wallet chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#8b5cf618", border: "1px solid #8b5cf630",
            padding: "6px 10px", fontSize: 11, color: "#a78bfa", fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }} />
            {shortAddr(wallet)}
          </div>
        </div>

        {/* Supported protocols */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 0 }}>
          <div title="Solana" style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#070708", border: "1px solid #18181c",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconSolana size={14} />
          </div>
          <div title="Pump.fun" style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#070708", border: "1px solid #18181c",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13,
          }}>
            🚀
          </div>
          <div title="Jupiter" style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#070708", border: "1px solid #18181c",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13,
          }}>
            ⚡
          </div>
          <span style={{ fontSize: 10, color: "#48484f", marginLeft: 2 }}>All GEASS trades eligible</span>
        </div>
      </div>

      {/* Unclaimed rewards card */}
      <div style={{
        background: "#070708", border: "1px solid #18181c",
        padding: isMobile ? "28px 20px" : "36px 32px",
        marginBottom: 2, textAlign: "center",
      }}>
        <div style={{ fontSize: 10, color: "#48484f", letterSpacing: "2px", fontWeight: 700, marginBottom: 18, textTransform: "uppercase" }}>
          Unclaimed Rewards
        </div>

        {loading ? (
          <div style={{ fontSize: 42, fontWeight: 800, color: "#2a2a35", marginBottom: 28 }}>—</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
            <IconSolana size={36} />
            <span style={{ fontSize: isMobile ? 38 : 52, fontWeight: 800, color: "#f4f4f5", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {(stats?.unclaimed ?? 0).toFixed(4)}
            </span>
          </div>
        )}

        {/* Claim button */}
        <button
          onClick={claim}
          disabled={!canClaim || claiming || loading}
          style={{
            width: "100%", padding: "14px 24px",
            background: justClaimed
              ? "#10b981"
              : canClaim
              ? "linear-gradient(135deg,#ff2b4e,#e0203f)"
              : "#18181c",
            border: "none",
            color: canClaim || justClaimed ? "#fff" : "#3a3a42",
            fontSize: 14, fontWeight: 800, cursor: canClaim && !claiming ? "pointer" : "not-allowed",
            letterSpacing: "0.04em", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            fontFamily: MONO,
            transition: "background .2s, transform .1s",
          }}
        >
          {justClaimed ? (
            <><IconCheck size={16} /> Claimed!</>
          ) : claiming ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>◎</span> Claiming…</>
          ) : (
            <>
              <IconSolana size={16} />
              {canClaim
                ? `Claim ${(stats?.unclaimed ?? 0).toFixed(4)} SOL`
                : `Min. ${stats?.minClaimSol ?? 0.05} SOL to claim`}
            </>
          )}
        </button>

        {claimMsg && (
          <div style={{
            marginTop: 12, fontSize: 11,
            color: claimMsg.ok ? "#10b981" : "#ef4444",
            wordBreak: "break-all", lineHeight: 1.5,
          }}>
            {claimMsg.text}
          </div>
        )}

        {/* Total claimed */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#48484f" }}>Total claimed</span>
          <IconSolana size={11} />
          <span style={{ fontSize: 11, color: "#6b6b7a", fontWeight: 700 }}>
            {loading ? "—" : (stats?.totalClaimed ?? 0).toFixed(4)}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        background: "#070708", border: "1px solid #18181c",
        padding: "16px 24px", marginBottom: 2,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
        textAlign: "center",
      }}>
        {[
          { label: "Rate",         value: `${pct}%`,                           color: "#ff2b4e" },
          { label: "Trades",       value: loading ? "—" : String(stats?.tradeCount ?? 0), color: "#a78bfa" },
          { label: "Min. Claim",   value: `${stats?.minClaimSol ?? 0.05} SOL`, color: "#6b6b7a" },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: "#48484f", letterSpacing: "1.5px", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* How to earn */}
      <div style={{ background: "#070708", border: "1px solid #18181c", padding: "20px 24px", marginBottom: 2 }}>
        <div style={{ fontSize: 10, color: "#48484f", letterSpacing: "2px", fontWeight: 700, marginBottom: 14, textTransform: "uppercase" }}>
          How to earn
        </div>
        {[
          { icon: "🚀", title: "Launch tokens on Pump.fun",     desc: `Earn ${pct}% cashback on your dev-buy SOL` },
          { icon: "⚡", title: "Snipe tokens via Auto-Snipe",    desc: `Earn ${pct}% cashback on every snipe` },
          { icon: "🔄", title: "Swap via Jupiter",              desc: `Earn ${pct}% cashback on every swap` },
          { icon: "🎯", title: "Bundled launches",              desc: `Earn ${pct}% cashback on all wallet buys` },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#0d0d10", border: "1px solid #1e1e25",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#d4d4d8", marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 10, color: "#52525b", lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh */}
      <button
        onClick={load}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: "1px solid #18181c",
          color: "#48484f", fontSize: 10, padding: "8px 14px",
          cursor: loading ? "not-allowed" : "pointer", width: "100%",
          justifyContent: "center", fontFamily: MONO, letterSpacing: "1px",
          fontWeight: 700,
        }}
      >
        <span style={{ display: "inline-block", animation: loading ? "spin 1s linear infinite" : "none" }}>
          <IconRefresh size={11} />
        </span>
        {loading ? "LOADING…" : "REFRESH STATUS"}
      </button>
    </div>
  );
}
