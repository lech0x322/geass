"use client";
import { useState, useRef, useEffect } from "react";
import { TIER } from "@/lib/config";
import { fmtMcap } from "@/lib/utils";
import type { Gem } from "@/lib/types";
import { IconZap, IconSolana, IconCheck, IconX } from "./icons";

function BondingCurveBar({ pct, sol }: { pct: number; sol: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 70 ? "#10b981" : clamped >= 30 ? "#eab308" : "#7c3aed";
  return (
    <div title={`Pump.fun bonding curve · ${sol.toFixed(2)} SOL collected`}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#52525b", letterSpacing: ".8px", marginBottom: 3 }}>
        <span>BONDING CURVE</span>
        <span style={{ color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
          {clamped.toFixed(0)}% · {sol.toFixed(1)} <IconSolana size={8} />
        </span>
      </div>
      <div style={{ height: 4, background: "#18181b", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${clamped}%`, height: "100%", background: color, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

const BADGE_INFO: Record<string, { title: string; safe: string; risk: string }> = {
  MINT: {
    title: "Mint Authority",
    safe: "Mint authority is revoked — no one can create new tokens. The total supply is fixed forever. This is the safest state.",
    risk: "Mint authority is ACTIVE — the creator can print unlimited new tokens at any time, instantly diluting your position. High risk.",
  },
  FREEZE: {
    title: "Freeze Authority",
    safe: "Freeze authority is revoked — no one can freeze your wallet or prevent you from selling. Safe.",
    risk: "Freeze authority is ACTIVE — the creator can freeze your token account, blocking you from selling or transferring. High risk.",
  },
};

function SafetyBadge({ ok, label }: { ok: boolean; label: string }) {
  const c = ok ? "#10b981" : "#f59e0b";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const info = BADGE_INFO[label];

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          fontSize: 8, fontWeight: 700, color: c,
          background: c + "15", border: `1px solid ${c}40`,
          padding: "2px 6px", borderRadius: 3, letterSpacing: ".5px",
          display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer",
        }}>
        {ok ? <IconCheck size={9} /> : <span style={{ fontSize: 9, color: c }}>!</span>}
        {label}
      </button>
      {open && info && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "#18181b", border: "1px solid #27272a", borderRadius: 10,
          padding: "12px 14px", width: 240, boxShadow: "0 8px 32px #000000a0",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#f4f4f5", marginBottom: 6 }}>{info.title}</div>
          <div style={{ fontSize: 10, color: ok ? "#10b981" : "#f59e0b", lineHeight: 1.6, display: "flex", gap: 6 }}>
            {ok ? <IconCheck size={11} /> : <IconX size={11} />}
            <span>{ok ? info.safe : info.risk}</span>
          </div>
        </div>
      )}
    </span>
  );
}

export function GemCard({ gem, isNew, onSnipe, onDex, onWatch, isWatched, isMobile }: {
  gem: Gem;
  isNew: boolean;
  onSnipe: (g: Gem) => void;
  onDex?: (address: string, symbol: string) => void;
  onWatch?: (mint: string, sym: string, name: string) => void;
  isWatched?: boolean;
  isMobile?: boolean;
}) {
  const tier = TIER[gem.tier] || TIER.C_TIER;
  const mcap = fmtMcap(gem.mcap);
  const btnH = isMobile ? 40 : 30;

  return (
    <div className={isNew ? "gem-new" : ""}
      style={{ background: "#111113", border: `1px solid ${isNew ? "#10b98150" : "#1e1e21"}`,
        borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden" }}>
      {isNew && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#10b981,transparent)" }} className="pulse"/>}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#dc262630,#7c3aed30)", border: "1px solid #27272a",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#f4f4f5" }}>{gem.sym?.[0] || "?"}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#f4f4f5", letterSpacing: ".3px" }}>${gem.sym}</div>
            <div style={{ fontSize: 10, color: "#52525b", marginTop: 1 }}>{gem.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: tier.c, background: tier.c + "18", padding: "2px 7px", borderRadius: 4, border: `1px solid ${tier.c}30` }}>{tier.l}</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
        {([
          ["MCAP", mcap],
          ["X POT", `${gem.xPotential}x`],
          ["KOL", gem.kol > 0 ? `${gem.kol} ✓` : "—"],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} style={{ background: "#09090b", borderRadius: 6, padding: "5px 7px" }}>
            <div style={{ fontSize: 8, color: "#3f3f46", letterSpacing: ".8px" }}>{l}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: l === "KOL" && gem.kol > 0 ? "#10b981" : "#d4d4d8", marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* KOL buyers */}
      {gem.kolBuyers?.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {gem.kolBuyers.slice(0, 3).map((k, i) => (
            <span key={i} style={{ fontSize: 9, fontWeight: 600, color: "#f4f4f5",
              background: (["#ef444425", "#f9731625", "#eab30825"][i] || "#222"),
              border: `1px solid ${["#ef444450", "#f9731650", "#eab30850"][i] || "#333"}`,
              padding: "2px 7px", borderRadius: 4 }}>
              {k.l || k.label} · {k.s || k.solAmount} SOL
            </span>
          ))}
        </div>
      )}

      {/* Safety badges */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <SafetyBadge ok={gem.mintRev} label="MINT" />
        <SafetyBadge ok={gem.freezeRev} label="FREEZE" />
        {gem.holders > 0 && (
          <span title={`${gem.holders} top holders observed`}
            style={{ fontSize: 8, fontWeight: 700, color: "#71717a", background: "#18181b", border: "1px solid #27272a", padding: "2px 6px", borderRadius: 3, letterSpacing: ".5px" }}>
            HLD {gem.holders}
          </span>
        )}
        {gem.bondingCurve?.complete && (
          <span title="Migrated to Raydium"
            style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "#10b98115", border: "1px solid #10b98140", padding: "2px 6px", borderRadius: 3, letterSpacing: ".5px" }}>
            ✓ RAYDIUM
          </span>
        )}
      </div>

      {/* Bonding curve */}
      {gem.bondingCurve && !gem.bondingCurve.complete && (
        <BondingCurveBar pct={gem.bondingCurve.progress} sol={gem.bondingCurve.solCollected} />
      )}

      {/* Signals */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {gem.reasons?.slice(0, 3).map((r, i) => (
          <div key={i} style={{ fontSize: 10, color: "#71717a", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#10b981", fontSize: 8 }}>✓</span>{r}
          </div>
        ))}
        {gem.redFlags?.slice(0, 2).map((r, i) => (
          <div key={i} style={{ fontSize: 10, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>⚠ {r}</div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 5 }}>
        <a href={gem.contractAddress ? `https://pump.fun/coin/${gem.contractAddress}` : "#"} target="_blank" rel="noreferrer"
          style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", padding: `0 4px`,
            minHeight: btnH, borderRadius: 7, fontSize: 10, fontWeight: 600, textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          Pump ↗
        </a>
        {onWatch && gem.contractAddress && (
          <button onClick={() => onWatch(gem.contractAddress, gem.sym, gem.name)}
            title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            style={{ minWidth: btnH, minHeight: btnH, borderRadius: 7, border: `1px solid ${isWatched ? "#f59e0b55" : "#27272a"}`,
              background: isWatched ? "#f59e0b18" : "transparent", color: isWatched ? "#f59e0b" : "#71717a",
              fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isWatched ? "★" : "☆"}
          </button>
        )}
        {onDex && gem.contractAddress && (
          <button onClick={() => onDex(gem.contractAddress, gem.sym)}
            style={{ flex: 1, background: "#f9731612", border: "1px solid #f9731640", color: "#f97316", minHeight: btnH,
              borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            DEX ↗
          </button>
        )}
        <button onClick={() => onSnipe(gem)}
          style={{ flex: 1, background: "linear-gradient(135deg,#dc2626,#7c3aed)", border: "none", color: "#fff", minHeight: btnH,
            borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: ".5px",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <IconZap size={11} /> SNIPE
        </button>
      </div>
    </div>
  );
}
