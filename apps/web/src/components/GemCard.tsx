"use client";
import { TIER } from "@/lib/config";
import { fmtMcap } from "@/lib/utils";
import type { Gem } from "@/lib/types";
import { ScoreRing } from "./ScoreRing";
import { IconCheck, IconZap, IconArrowUpRight } from "./icons";

function BondingCurveBar({ pct, sol }: { pct: number; sol: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 70 ? "#10b981" : clamped >= 30 ? "#eab308" : "#7c3aed";
  return (
    <div title={`Pump.fun bonding curve · ${sol.toFixed(2)} SOL collected`}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#52525b", letterSpacing: ".8px", marginBottom: 3 }}>
        <span>BONDING CURVE</span>
        <span style={{ color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{clamped.toFixed(0)}% · {sol.toFixed(1)} SOL</span>
      </div>
      <div style={{ height: 4, background: "#18181b", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${clamped}%`, height: "100%", background: color, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

function SafetyBadge({ ok, label, tip }: { ok: boolean; label: string; tip: string }) {
  const c = ok ? "#10b981" : "#f59e0b";
  return (
    <span title={tip} style={{
      fontSize: 8, fontWeight: 700, color: c,
      background: c + "15", border: `1px solid ${c}40`,
      padding: "2px 6px", borderRadius: 3, letterSpacing: ".5px",
      display: "inline-flex", alignItems: "center", gap: 3,
    }}>
      {ok ? <IconCheck size={9} strokeWidth={2.5} /> : <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 700 }}>!</span>}
      {label}
    </span>
  );
}

export function GemCard({ gem, isNew, onSnipe }: { gem: Gem; isNew: boolean; onSnipe: (g: Gem) => void }) {
  const tier = TIER[gem.tier] || TIER.C_TIER;
  return (
    <div className={isNew ? "gem-new" : ""}
      style={{ background: "#111113", border: `1px solid ${isNew ? "#10b98150" : "#1e1e21"}`,
        borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden" }}>
      {isNew && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#10b981,transparent)" }} className="pulse"/>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,rgba(239,68,68,.18),rgba(139,92,246,.18))", border: "1px solid #27272a",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#f4f4f5" }}>{gem.sym?.[0] || "?"}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#f4f4f5", letterSpacing: ".3px" }}>${gem.sym}</div>
            <div style={{ fontSize: 10, color: "#52525b", marginTop: 1 }}>{gem.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <ScoreRing score={gem.score} size={46}/>
          <span style={{ fontSize: 9, fontWeight: 700, color: tier.c, background: tier.c + "18", padding: "2px 7px", borderRadius: 4, border: `1px solid ${tier.c}30` }}>{tier.l}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
        {([["MCAP", fmtMcap(gem.mcap)], ["X POT", `${gem.xPotential}x`], ["KOL", gem.kol > 0 ? `${gem.kol} ✓` : "—"]] as [string, string][]).map(([l, v]) => (
          <div key={l} style={{ background: "#09090b", borderRadius: 6, padding: "5px 7px" }}>
            <div style={{ fontSize: 8, color: "#3f3f46", letterSpacing: ".8px" }}>{l}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: l === "KOL" && gem.kol > 0 ? "#10b981" : "#d4d4d8", marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>
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
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <SafetyBadge ok={gem.mintRev} label="MINT" tip={gem.mintRev ? "Mint authority revoked" : "Mint authority active"} />
        <SafetyBadge ok={gem.freezeRev} label="FREEZE" tip={gem.freezeRev ? "Freeze authority revoked" : "Freeze authority active"} />
        {gem.holders > 0 && (
          <span title={`${gem.holders} top holders observed`}
            style={{ fontSize: 8, fontWeight: 700, color: "#71717a", background: "#18181b", border: "1px solid #27272a", padding: "2px 6px", borderRadius: 3, letterSpacing: ".5px" }}>
            HLD {gem.holders}
          </span>
        )}
        {gem.bondingCurve?.complete && (
          <span title="Migrated to Raydium"
            style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 8, fontWeight: 700, color: "#10b981", background: "#10b98115", border: "1px solid #10b98140", padding: "2px 6px", borderRadius: 3, letterSpacing: ".5px" }}>
            <IconCheck size={9} strokeWidth={2.5} /> RAYDIUM
          </span>
        )}
      </div>
      {gem.bondingCurve && !gem.bondingCurve.complete && (
        <BondingCurveBar pct={gem.bondingCurve.progress} sol={gem.bondingCurve.solCollected} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {gem.reasons?.slice(0, 3).map((r, i) => (
          <div key={i} style={{ fontSize: 10.5, color: "#a1a1aa", display: "flex", alignItems: "center", gap: 5 }}>
            <IconCheck size={10} strokeWidth={2.4} style={{ color: "#10b981" }} />{r}
          </div>
        ))}
        {gem.redFlags?.slice(0, 2).map((r, i) => (
          <div key={i} style={{ fontSize: 10.5, color: "#f59e0b", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, textAlign: "center", fontWeight: 800, fontSize: 11, lineHeight: 1 }}>!</span>{r}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <a href={gem.contractAddress ? `https://pump.fun/coin/${gem.contractAddress}` : "#"} target="_blank" rel="noreferrer"
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", padding: "8px", borderRadius: 8,
            fontSize: 11, fontWeight: 500, textDecoration: "none", cursor: "pointer" }}>
          View on Pump.fun <IconArrowUpRight size={10} strokeWidth={2} />
        </a>
        <button onClick={() => onSnipe(gem)}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "linear-gradient(135deg,#ef4444,#8b5cf6)", border: "none", color: "#fff",
            padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: ".2px" }}>
          <IconZap size={11} strokeWidth={2} /> Snipe
        </button>
      </div>
    </div>
  );
}
