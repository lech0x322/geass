"use client";
import { useState } from "react";
import type { Gem } from "@/lib/types";
import { pumpTradeTx } from "@/lib/api";
import { signAndSendBytes } from "@/lib/wallet";
import { IconZap, IconX, IconCheck, IconRefresh } from "./icons";

export function SnipeModal({ gem, wallet, onClose }: { gem: Gem | null; wallet: string | null; onClose: () => void }) {
  const [amt, setAmt] = useState("0.5");
  const [step, setStep] = useState<"form" | "loading" | "done">("form");
  const [msg, setMsg] = useState("");
  if (!gem) return null;

  const doSnipe = async () => {
    if (!wallet) { setMsg("Connect Phantom first"); return; }
    const value = parseFloat(amt);
    if (!Number.isFinite(value) || value <= 0) { setMsg("Enter a positive amount"); return; }
    setStep("loading"); setMsg("Building transaction…");
    try {
      const bytes = await pumpTradeTx({
        publicKey: wallet,
        action: "buy",
        mint: gem.contractAddress,
        amount: value,
        slippage: 15,
        priorityFee: 0.001,
        pool: "pump",
      });
      setMsg("Sign in Phantom…");
      const sig = await signAndSendBytes(bytes);
      setMsg(`TX ${sig.slice(0, 16)}…`);
      setStep("done");
    } catch (e) {
      setMsg("Error: " + (e instanceof Error ? e.message : String(e)));
      setStep("form");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0c0c0e", border: "1px solid #1c1c1f", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
        {step === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: 14, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 14, color: "#10b981", marginBottom: 14 }}>
              <IconCheck size={26} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981", marginBottom: 6, letterSpacing: "-.2px" }}>Order submitted</div>
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4, fontFamily: "ui-monospace,monospace" }}>{msg}</div>
            <button onClick={onClose} style={{ marginTop: 14, background: "#ef4444", border: "none", color: "#fff", padding: "9px 22px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ display: "inline-flex", padding: 8, borderRadius: 9, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444" }}>
                  <IconZap size={14} strokeWidth={1.9} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#fafafa", letterSpacing: "-.2px" }}>Snipe ${gem.sym}</div>
                  <div style={{ fontSize: 11, color: "#52525b", marginTop: 1 }}>{gem.name} · Score {gem.score}</div>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "1px solid #27272a", borderRadius: 7, color: "#a1a1aa", cursor: "pointer" }}>
                <IconX size={12} />
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#52525b", letterSpacing: "1.5px", marginBottom: 8 }}>AMOUNT (SOL)</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {["0.1", "0.5", "1", "2", "5"].map(v => (
                <button key={v} onClick={() => setAmt(v)} style={{ flex: 1, padding: "7px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${amt === v ? "#ef4444" : "#27272a"}`, background: amt === v ? "rgba(239,68,68,.08)" : "transparent", color: amt === v ? "#ef4444" : "#71717a" }}>{v}</button>
              ))}
            </div>
            <input type="number" value={amt} step="0.01" min="0" onChange={e => setAmt(e.target.value)}
              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#fafafa", padding: "10px 12px", fontSize: 14, outline: "none", marginBottom: 12, fontVariantNumeric: "tabular-nums" }}/>
            {msg && <div style={{ fontSize: 11, color: msg.startsWith("TX") ? "#10b981" : "#f59e0b", marginBottom: 10, textAlign: "center" }}>{msg}</div>}
            <button onClick={doSnipe} disabled={step === "loading"}
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "linear-gradient(135deg,#ef4444,#8b5cf6)", border: "none", color: "#fff", padding: "11px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: step === "loading" ? "wait" : "pointer", letterSpacing: ".2px" }}>
              {step === "loading"
                ? (<><IconRefresh size={12} strokeWidth={2} className="spin" /> Processing…</>)
                : (<><IconZap size={12} strokeWidth={2} /> Buy {amt} SOL of ${gem.sym}</>)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
