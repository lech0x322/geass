"use client";
import { TIER } from "@/lib/config";
import { fmtMcap } from "@/lib/utils";
import type { Gem } from "@/lib/api";
import { ScoreRing } from "./ScoreRing";

export function GemCard({ gem, isNew, onSnipe }: { gem: Gem; isNew: boolean; onSnipe: (g: Gem) => void }) {
  const tier = TIER[gem.tier] || TIER.C_TIER;
  return (
    <div className={isNew ? "gem-new" : ""}
      style={{ background:"#111113", border:`1px solid ${isNew?"#10b98150":"#1e1e21"}`,
        borderRadius:12, padding:14, display:"flex", flexDirection:"column", gap:10, position:"relative", overflow:"hidden" }}>
      {isNew && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#10b981,transparent)" }} className="pulse"/>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#dc262630,#7c3aed30)", border:"1px solid #27272a",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#f4f4f5" }}>{gem.sym?.[0]||"?"}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:"#f4f4f5", letterSpacing:".3px" }}>${gem.sym}</div>
            <div style={{ fontSize:10, color:"#52525b", marginTop:1 }}>{gem.name}</div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <ScoreRing score={gem.score} size={46}/>
          <span style={{ fontSize:9, fontWeight:700, color:tier.c, background:tier.c+"18", padding:"2px 7px", borderRadius:4, border:`1px solid ${tier.c}30` }}>{tier.l}</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5 }}>
        {([["MCAP", fmtMcap(gem.mcap)], ["X POT", `${gem.xPotential}x`], ["KOL", gem.kol > 0 ? `${gem.kol} ✓` : "—"]] as [string,string][]).map(([l, v]) => (
          <div key={l} style={{ background:"#09090b", borderRadius:6, padding:"5px 7px" }}>
            <div style={{ fontSize:8, color:"#3f3f46", letterSpacing:".8px" }}>{l}</div>
            <div style={{ fontSize:11, fontWeight:700, color: l==="KOL" && gem.kol > 0 ? "#10b981" : "#d4d4d8", marginTop:1 }}>{v}</div>
          </div>
        ))}
      </div>
      {gem.kolBuyers?.length > 0 && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {gem.kolBuyers.slice(0,3).map((k, i) => (
            <span key={i} style={{ fontSize:9, fontWeight:600, color:"#f4f4f5",
              background: (["#ef444425","#f9731625","#eab30825"][i] || "#222"),
              border: `1px solid ${["#ef444450","#f9731650","#eab30850"][i]||"#333"}`,
              padding:"2px 7px", borderRadius:4 }}>
              {k.l||k.label} · {k.s||k.solAmount} SOL
            </span>
          ))}
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {gem.reasons?.slice(0,3).map((r, i) => (
          <div key={i} style={{ fontSize:10, color:"#71717a", display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ color:"#10b981", fontSize:8 }}>✓</span>{r}
          </div>
        ))}
        {gem.redFlags?.slice(0,1).map((r, i) => (
          <div key={i} style={{ fontSize:10, color:"#f59e0b", display:"flex", alignItems:"center", gap:4 }}>⚠ {r}</div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <a href={gem.contractAddress ? `https://pump.fun/token/${gem.contractAddress}` : "#"} target="_blank" rel="noreferrer"
          style={{ flex:1, background:"#18181b", border:"1px solid #27272a", color:"#a1a1aa", padding:"7px", borderRadius:7,
            fontSize:10, fontWeight:600, textDecoration:"none", textAlign:"center", cursor:"pointer" }}>
          View Pump.fun
        </a>
        <button onClick={() => onSnipe(gem)}
          style={{ flex:1, background:"linear-gradient(135deg,#dc2626,#7c3aed)", border:"none", color:"#fff",
            padding:"7px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:".5px" }}>
          ⚡ SNIPE
        </button>
      </div>
    </div>
  );
}
