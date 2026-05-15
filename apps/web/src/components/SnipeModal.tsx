"use client";
import { useState } from "react";
import type { Gem } from "@/lib/api";
import { toB64 } from "@/lib/config";

export function SnipeModal({ gem, wallet, onClose }: { gem: Gem | null; wallet: string | null; onClose: () => void }) {
  const [amt, setAmt] = useState("0.5");
  const [step, setStep] = useState<"form"|"loading"|"done">("form");
  const [msg, setMsg] = useState("");
  if (!gem) return null;

  const doSnipe = async () => {
    if (!wallet) { setMsg("Connect Phantom first"); return; }
    setStep("loading"); setMsg("Preparing transaction...");
    try {
      const res = await fetch("https://pump.fun/api/trade-local", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: wallet, action: "buy", mint: gem.contractAddress,
          amount: parseFloat(amt), denominatedInSol: "true", slippage: 15, priorityFee: 0.001, pool: "pump" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error("pump.fun " + res.status);
      const bytes = new Uint8Array(await res.arrayBuffer());
      setMsg("Sign in Phantom...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { solana } = window as any;
      if (!solana?.isPhantom) throw new Error("Phantom not found");
      try {
        const r = await solana.request({ method: "signAndSendTransaction", params: { transaction: toB64(bytes) } });
        setMsg("✓ TX: " + (r?.signature || "").slice(0, 16) + "..."); setStep("done");
      } catch {
        const r = await solana.signAndSendTransaction({ serialize: () => bytes, serializeMessage: () => bytes });
        setMsg("✓ TX: " + (r?.signature || "").slice(0, 16) + "..."); setStep("done");
      }
    } catch (e: unknown) { setMsg("Error: " + (e instanceof Error ? e.message : String(e))); setStep("form"); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111113", border:"1px solid #27272a", borderRadius:14, padding:22, width:"100%", maxWidth:350 }}>
        {step === "done" ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#10b981", marginBottom:6 }}>Order Submitted!</div>
            <div style={{ fontSize:11, color:"#71717a", marginBottom:4 }}>{msg}</div>
            <button onClick={onClose} style={{ marginTop:12, background:"#dc2626", border:"none", color:"#fff", padding:"8px 20px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"#f4f4f5" }}>⚡ Snipe ${gem.sym}</div>
                <div style={{ fontSize:11, color:"#52525b" }}>{gem.name} · Score {gem.score}</div>
              </div>
              <button onClick={onClose} style={{ background:"none", border:"none", color:"#52525b", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ fontSize:10, color:"#52525b", letterSpacing:"1px", marginBottom:6 }}>AMOUNT (SOL)</div>
            <div style={{ display:"flex", gap:5, marginBottom:8 }}>
              {["0.1","0.5","1","2","5"].map(v => (
                <button key={v} onClick={() => setAmt(v)} style={{ flex:1, padding:"6px", borderRadius:6, fontSize:10, fontWeight:700, cursor:"pointer",
                  border:`1px solid ${amt===v?"#dc2626":"#27272a"}`, background: amt===v?"#dc262615":"transparent", color: amt===v?"#ef4444":"#71717a" }}>{v}</button>
              ))}
            </div>
            <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
              style={{ width:"100%", background:"#09090b", border:"1px solid #27272a", borderRadius:7, color:"#f4f4f5", padding:"9px 12px", fontSize:13, outline:"none", marginBottom:10 }}/>
            {msg && <div style={{ fontSize:10, color: msg.startsWith("✓") ? "#10b981" : "#f59e0b", marginBottom:8, textAlign:"center" }}>{msg}</div>}
            <button onClick={doSnipe} disabled={step==="loading"}
              style={{ width:"100%", background:"linear-gradient(135deg,#dc2626,#7c3aed)", border:"none", color:"#fff", padding:"10px", borderRadius:8, fontSize:12, fontWeight:700, cursor: step==="loading" ? "wait" : "pointer" }}>
              {step === "loading" ? <span className="pulse">⟳ Processing...</span> : `⚡ BUY ${amt} SOL of $${gem.sym}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
