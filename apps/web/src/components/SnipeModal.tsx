"use client";
import { useState } from "react";
import type { Gem } from "@/lib/types";
import { pumpPortal } from "@/lib/pumpportal";
import { jitoSubmit } from "@/lib/api";
import { TIP_DEFAULT_SOL, TIP_MIN_SOL, TIP_MAX_SOL } from "@geass/sdk/jito";
import { IconZap, IconX, IconCheck, IconRefresh } from "./icons";

type Mode = "phantom" | "jito-phantom" | "jito-server";

const GEASS_PUBKEY = process.env.NEXT_PUBLIC_GEASS_WALLET_PUBKEY ?? "";

const MODE_LABELS: Record<Mode, string> = {
  "phantom":      "Standard",
  "jito-phantom": "Jito (your wallet)",
  "jito-server":  "Jito (GEASS wallet)",
};
const MODE_DESC: Record<Mode, string> = {
  "phantom":      "Via Phantom · standard priority fee",
  "jito-phantom": "Anti-MEV bundle · you sign · Phantom",
  "jito-server":  "Anti-MEV bundle · server signs instantly",
};

export function SnipeModal({
  gem,
  wallet,
  onClose,
}: {
  gem:    Gem | null;
  wallet: string | null;
  onClose: () => void;
}) {
  const [amt, setAmt]       = useState("0.5");
  const [tipSol, setTipSol] = useState(String(TIP_DEFAULT_SOL));
  const [mode, setMode]     = useState<Mode>("phantom");
  const [step, setStep]     = useState<"form" | "loading" | "done">("form");
  const [msg, setMsg]       = useState("");

  if (!gem) return null;

  const doSnipe = async () => {
    if (mode !== "jito-server" && !wallet) { setMsg("Connect Phantom first"); return; }
    const value = parseFloat(amt);
    const tip   = parseFloat(tipSol);
    if (!Number.isFinite(value) || value <= 0) { setMsg("Enter a positive amount"); return; }
    setStep("loading");
    setMsg("Building transaction…");

    try {
      const baseParams = {
        publicKey: wallet ?? "",
        action:    "buy" as const,
        mint:      gem.contractAddress,
        amount:    value,
        slippage:  15,
        tipSol:    Number.isFinite(tip) ? tip : TIP_DEFAULT_SOL,
      };

      if (mode === "phantom") {
        // ── Standard Phantom: build → Phantom signs + sends in one step ──
        const result = await pumpPortal.phantomTrade(baseParams);
        setMsg(`TX ${result.signature!.slice(0, 18)}…`);

      } else if (mode === "jito-phantom") {
        // ── Jito Phantom: build → Phantom signs → Jito bundle ─────────────
        setMsg("Building Jito transaction…");
        const result = await pumpPortal.jitoPhantomTrade({ ...baseParams, pool: "pump" });
        setMsg(`Bundle ${result.bundleId!.slice(0, 18)}…`);

      } else {
        // ── Jito GEASS server: build in browser → server signs + submits ──
        if (!GEASS_PUBKEY) throw new Error("GEASS wallet not configured");
        setMsg("Submitting Jito bundle…");
        const result = await pumpPortal.jitoServerTrade({ ...baseParams, pool: "pump" }, GEASS_PUBKEY);
        setMsg(`Bundle ${result.bundleId!.slice(0, 18)}…`);
      }

      setStep("done");
    } catch (e) {
      setMsg("Error: " + (e instanceof Error ? e.message : String(e)));
      setStep("form");
    }
  };

  const accent = mode === "phantom" ? "#ef4444" : "#a855f7";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0c0c0e", border: "1px solid #1c1c1f", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}
      >
        {step === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: 14, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 14, color: "#10b981", marginBottom: 14 }}>
              <IconCheck size={26} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981", marginBottom: 6 }}>
              {mode === "phantom" ? "Order submitted" : "Bundle submitted"}
            </div>
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4, fontFamily: "ui-monospace,monospace" }}>{msg}</div>
            {mode !== "phantom" && (
              <div style={{ fontSize: 9, color: "#3f3f46", marginBottom: 8 }}>
                Verify at <a href="https://explorer.jito.wtf" target="_blank" rel="noopener noreferrer" style={{ color: "#a855f7" }}>explorer.jito.wtf</a>
              </div>
            )}
            <button onClick={onClose} style={{ marginTop: 10, background: "#ef4444", border: "none", color: "#fff", padding: "9px 22px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ display: "inline-flex", padding: 8, borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}40`, color: accent }}>
                  <IconZap size={14} strokeWidth={1.9} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#fafafa" }}>Snipe ${gem.sym}</div>
                  <div style={{ fontSize: 11, color: "#52525b", marginTop: 1 }}>{gem.name} · Score {gem.score}</div>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "1px solid #27272a", borderRadius: 7, color: "#a1a1aa", cursor: "pointer" }}>
                <IconX size={12} />
              </button>
            </div>

            {/* Mode selector */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", marginBottom: 6 }}>EXECUTION MODE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(["phantom", "jito-phantom", "jito-server"] as Mode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ padding: "7px 10px", borderRadius: 7, cursor: "pointer", textAlign: "left",
                      border: `1px solid ${mode === m ? accent : "#27272a"}`,
                      background: mode === m ? `${accent}12` : "transparent" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: mode === m ? accent : "#71717a" }}>{MODE_LABELS[m]}</div>
                    <div style={{ fontSize: 9, color: "#3f3f46" }}>{MODE_DESC[m]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", marginBottom: 8 }}>AMOUNT (SOL)</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              {["0.1", "0.5", "1", "2", "5"].map(v => (
                <button key={v} onClick={() => setAmt(v)} style={{ flex: 1, padding: "7px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${amt === v ? "#ef4444" : "#27272a"}`, background: amt === v ? "rgba(239,68,68,.08)" : "transparent", color: amt === v ? "#ef4444" : "#71717a" }}>{v}</button>
              ))}
            </div>
            <input type="number" value={amt} step="0.01" min="0" onChange={e => setAmt(e.target.value)}
              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#fafafa", padding: "10px 12px", fontSize: 14, outline: "none", marginBottom: 12, fontVariantNumeric: "tabular-nums" }} />

            {/* Jito tip (only for bundle modes) */}
            {mode !== "phantom" && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
                  <span>JITO TIP</span>
                  <span style={{ color: "#a855f7", fontWeight: 700 }}>{parseFloat(tipSol).toFixed(4)} SOL</span>
                </div>
                <input type="range" min={TIP_MIN_SOL} max={TIP_MAX_SOL} step={0.0005} value={tipSol}
                  onChange={e => setTipSol(e.target.value)} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3f3f46", marginTop: 2 }}>
                  <span>{TIP_MIN_SOL} SOL — economical</span>
                  <span>{TIP_MAX_SOL} SOL — fastest</span>
                </div>
              </div>
            )}

            {msg && (
              <div style={{ fontSize: 11, color: msg.startsWith("Error") ? "#ef4444" : "#f59e0b", marginBottom: 10, textAlign: "center" }}>{msg}</div>
            )}

            <button onClick={doSnipe} disabled={step === "loading"}
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: mode === "phantom"
                  ? "linear-gradient(135deg,#ef4444,#8b5cf6)"
                  : "linear-gradient(135deg,#7c3aed,#a855f7)",
                border: "none", color: "#fff", padding: "11px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                cursor: step === "loading" ? "wait" : "pointer", letterSpacing: ".2px",
                opacity: step === "loading" ? 0.7 : 1 }}>
              {step === "loading"
                ? (<><IconRefresh size={12} strokeWidth={2} className="spin" /> Processing…</>)
                : (<><IconZap size={12} strokeWidth={2} /> {MODE_LABELS[mode]} — {amt} SOL of ${gem.sym}</>)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
