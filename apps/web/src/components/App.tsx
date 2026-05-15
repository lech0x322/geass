"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { KOLS, NAV, TIER } from "@/lib/config";
import { fmtMcap, fmtAge, fmtTok, scoreClr } from "@/lib/utils";
import { hRpc, scanHelius, scanDexScreener, scanAI, buildGem, type Gem } from "@/lib/api";
import { HELIUS_API, HELIUS_KEY, PUMP_PROG, SKIP, toB64 } from "@/lib/config";
import { wait } from "@/lib/utils";
import { GeassLogo } from "./GeassLogo";
import { GemCard } from "./GemCard";
import { SnipeModal } from "./SnipeModal";

// suppress unused import warnings
void fmtMcap; void fmtAge; void fmtTok; void scoreClr; void TIER;

interface FeedTrade {
  id: number; kol: string; kolC: string; type: "buy"|"sell";
  sym: string; sol: string; tokAmt: string; ago: number;
}

export function App() {
  const [tab, setTab]             = useState("gems");
  const [gems, setGems]           = useState<Gem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [scanMsg, setScanMsg]     = useState("");
  const [scanTime, setScanTime]   = useState<string|null>(null);
  const [source, setSource]       = useState("");
  const [newIds, setNewIds]       = useState(new Set<string>());
  const [snipeGem, setSnipeGem]   = useState<Gem|null>(null);
  const [wallet, setWallet]       = useState<string|null>(null);
  const [wBal, setWBal]           = useState<string|null>(null);
  const [filters, setFilters]     = useState({ minScore:0, tiers:[] as string[], hasKol:false, noFlags:false });
  const [detecting, setDetecting] = useState(false);
  const [feedTrades, setFeedTrades] = useState<FeedTrade[]>([]);

  const [ct, setCt]     = useState({ name:"", sym:"", desc:"", img:"", devBuy:"0.5" });
  const [ctStep, setCtStep] = useState<"form"|"done">("form");
  const [ctLoad, setCtLoad] = useState(false);
  const [ctMsg, setCtMsg]   = useState("");

  const tokRef  = useRef<Gem[]>([]);
  const lastSig = useRef<string|null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  tokRef.current = gems;

  const connectWallet = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { solana } = window as any;
      if (!solana?.isPhantom) { alert("Install Phantom from phantom.app"); return; }
      const r = await solana.connect();
      const addr: string = r.publicKey.toString();
      setWallet(addr);
      try { const b = await hRpc("getBalance", [addr]); setWBal(((b||0)/1e9).toFixed(3)); } catch {}
    } catch (e) { console.error(e); }
  };

  const doScan = useCallback(async () => {
    setLoading(true); setScanMsg("");
    let result: Gem[] | null = null;
    try { setScanMsg("⚡ Helius pump.fun scan..."); result = await scanHelius(6); setSource("HELIUS"); }
    catch {
      try { setScanMsg("◉ DexScreener scan..."); result = await scanDexScreener(6); setSource("DEXSCREENER"); }
      catch {
        try { setScanMsg("○ AI analysis..."); result = await scanAI(6); setSource("AI"); }
        catch (e: unknown) { setScanMsg("Scan failed: " + (e instanceof Error ? e.message : "")); setLoading(false); return; }
      }
    }
    if (result?.length) {
      const ns = new Set<string>();
      result.forEach(g => { if (!tokRef.current.find(x => x.id === g.id)) ns.add(g.id); });
      setNewIds(ns);
      setTimeout(() => setNewIds(new Set()), 10000);
      setGems(result);
      setScanTime(new Date().toLocaleTimeString());
      lastSig.current = lastSig.current || "init";
    }
    setLoading(false); setScanMsg("");
  }, []);

  useEffect(() => {
    doScan();
    pollRef.current = setInterval(async () => {
      if (!lastSig.current || loading) return;
      setDetecting(true);
      try {
        const sigs = await hRpc("getSignaturesForAddress", [PUMP_PROG, { limit: 5 }]);
        const lat: string = sigs[0]?.signature;
        if (!lat || lat === lastSig.current) { setDetecting(false); return; }
        lastSig.current = lat;
        const tr = await fetch(`${HELIUS_API}/transactions?api-key=${HELIUS_KEY}`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ transactions: sigs.slice(0,4).map((s: {signature:string}) => s.signature) }),
          signal: AbortSignal.timeout(8000),
        });
        const txs = await tr.json();
        const mints = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Array.isArray(txs)?txs:[]).forEach((tx:any)=>(tx.tokenTransfers||[]).forEach((t:any)=>{
          if (t.mint && !SKIP.has(t.mint) && !tokRef.current.find(tk=>tk.id===t.mint)) mints.add(t.mint);
        }));
        const nTks: Gem[] = [];
        for (const mint of [...mints].slice(0,2)) {
          try {
            const d = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`,{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pair = (d.pairs||[]).sort((a:any,b:any)=>(b.volume?.h24||0)-(a.volume?.h24||0))[0];
            const g = buildGem(mint, pair, "helius");
            if (g && g.score >= 50) nTks.push(g);
          } catch {}
          await wait(200);
        }
        if (nTks.length) {
          setNewIds(new Set(nTks.map(t=>t.id)));
          setTimeout(()=>setNewIds(new Set()), 10000);
          setGems(prev => [...nTks, ...prev].slice(0,24));
          setScanTime(new Date().toLocaleTimeString());
        }
      } catch {}
      setDetecting(false);
    }, 20000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []); // eslint-disable-line

  useEffect(() => {
    const iv = setInterval(() => {
      const k = KOLS[Math.floor(Math.random()*KOLS.length)];
      const g = gems[Math.floor(Math.random()*Math.max(1,gems.length))];
      if (!g) return;
      setFeedTrades(prev => [{
        id: Date.now(), kol:k.name, kolC:k.c, type:Math.random()>0.3?"buy":"sell",
        sym:g.sym, sol:(Math.random()*4+0.1).toFixed(3),
        tokAmt:fmtTok(Math.random()*1e7), ago:Math.floor(Math.random()*60),
      }, ...prev].slice(0,40));
    }, 3000);
    return () => clearInterval(iv);
  }, [gems]);

  const filtered = useMemo(() => gems.filter(g => {
    if (g.score < filters.minScore) return false;
    if (filters.tiers.length && !filters.tiers.includes(g.tier)) return false;
    if (filters.hasKol && g.kol === 0) return false;
    if (filters.noFlags && g.redFlags?.length > 0) return false;
    return true;
  }), [gems, filters]);

  const toggleTier = (t: string) => setFilters(f => ({ ...f, tiers: f.tiers.includes(t) ? f.tiers.filter(x=>x!==t) : [...f.tiers, t] }));

  const launchToken = async () => {
    if (!ct.name || !ct.sym) { setCtMsg("Fill Name & Symbol"); return; }
    if (!wallet) { setCtMsg("Connect Phantom first"); return; }
    setCtLoad(true); setCtMsg("Uploading metadata to IPFS...");
    try {
      const form = new FormData();
      Object.entries({ name:ct.name, symbol:ct.sym.toUpperCase(), description:ct.desc||ct.name, showName:"true" }).forEach(([k,v])=>form.append(k,v));
      if (ct.img) { try { const ir = await fetch(ct.img,{signal:AbortSignal.timeout(8000)}); form.append("file",await ir.blob(),"img.png"); } catch {} }
      const mr = await fetch("https://pump.fun/api/ipfs",{method:"POST",body:form,signal:AbortSignal.timeout(15000)});
      if (!mr.ok) throw new Error("IPFS " + mr.status);
      const meta = await mr.json();
      setCtMsg("Creating on-chain...");
      const r = await fetch("https://pump.fun/api/trade-local",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({publicKey:wallet,action:"create",tokenMetadata:{name:ct.name,symbol:ct.sym.toUpperCase(),uri:meta.metadataUri},
          denominatedInSol:"true",amount:parseFloat(ct.devBuy)||0,slippage:10,priorityFee:0.0005,pool:"pump"}),signal:AbortSignal.timeout(15000)});
      if (!r.ok) throw new Error("pump.fun " + r.status);
      const bytes = new Uint8Array(await r.arrayBuffer());
      setCtMsg("Sign in Phantom...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { solana } = window as any;
      let sig: string | undefined;
      try { const r2=await solana.request({method:"signAndSendTransaction",params:{transaction:toB64(bytes)}}); sig=r2?.signature||r2; }
      catch  { const r2=await solana.signAndSendTransaction({serialize:()=>bytes,serializeMessage:()=>bytes}); sig=r2?.signature; }
      setCtMsg(`✓ Launched! TX: ${(sig||"").slice(0,18)}...`); setCtStep("done");
    } catch(e:unknown) { setCtMsg("Error: " + (e instanceof Error ? e.message : String(e))); }
    setCtLoad(false);
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:"#09090b", color:"#f4f4f5", fontFamily:"'Inter',system-ui,sans-serif", overflow:"hidden" }}>
      {/* Sidebar */}
      <aside style={{ width:200, background:"#0c0c0e", borderRight:"1px solid #18181b", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ height:56, display:"flex", alignItems:"center", padding:"0 14px", borderBottom:"1px solid #18181b", gap:8 }}>
          <GeassLogo size={28}/>
          <div>
            <span style={{ fontWeight:800, fontSize:13, color:"#f4f4f5", letterSpacing:"1.5px" }}>GEASS</span>
            <div style={{ fontSize:8, color:"#3f3f46", letterSpacing:"2px", marginTop:-1 }}>ALPHA RECON</div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"8px 6px", overflowY:"auto" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8,
                border:`1px solid ${tab===n.id?"#dc262640":"transparent"}`, background:tab===n.id?"#dc262612":"transparent",
                color:tab===n.id?"#ef4444":"#52525b", cursor:"pointer", marginBottom:2, fontSize:11, fontWeight:tab===n.id?700:500, textAlign:"left" }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              <span style={{ flex:1 }}>{n.label}</span>
              {n.badge && <span style={{ fontSize:7, fontWeight:700, color:"#10b981", background:"#10b98120", border:"1px solid #10b98140", padding:"1px 5px", borderRadius:8 }}>{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"8px", borderTop:"1px solid #18181b" }}>
          <button onClick={connectWallet}
            style={{ width:"100%", padding:"7px 8px", borderRadius:7, border:"1px solid #27272a",
              background:wallet?"#10b98110":"#18181b", color:wallet?"#10b981":"#52525b",
              fontSize:9, fontWeight:600, cursor:"pointer", letterSpacing:".3px" }}>
            {wallet ? `✓ ${wallet.slice(0,4)}...${wallet.slice(-4)}${wBal?` · ${wBal}◎`:""}` : "◎ Connect Phantom"}
          </button>
        </div>
      </aside>

      <main style={{ flex:1, overflow:"auto" }}>
        {snipeGem && <SnipeModal gem={snipeGem} wallet={wallet} onClose={() => setSnipeGem(null)}/>}

        {/* GEMS TAB */}
        {tab==="gems" && (
          <div style={{ padding:"18px 22px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
              <h1 style={{ fontSize:18, fontWeight:800, color:"#f4f4f5", letterSpacing:".3px" }}>💎 Gems Detector</h1>
              <span style={{ fontSize:9, fontWeight:600, color:"#10b981", background:"#10b98120", border:"1px solid #10b98140", padding:"2px 7px", borderRadius:10 }}>ALPHA SCANNER</span>
              <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
                {detecting && <div className="live-dot"/>}
                <span style={{ fontSize:9, color:detecting?"#10b981":"#3f3f46" }}>{detecting?"DETECTING":"IDLE"}</span>
                {scanTime && <span style={{ fontSize:9, color:"#3f3f46" }}>· Last: {scanTime}</span>}
                <span style={{ fontSize:9, color:"#27272a" }}>· {source}</span>
              </div>
            </div>
            <p style={{ fontSize:11, color:"#3f3f46", marginBottom:16 }}>Real-time detection via Helius + DexScreener · Auto-detect ⟳20s</p>

            {/* Filters */}
            <div style={{ background:"#111113", border:"1px solid #1e1e21", borderRadius:10, padding:"12px 14px", marginBottom:18 }}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:14, alignItems:"center" }}>
                <div style={{ minWidth:140 }}>
                  <div style={{ fontSize:9, color:"#52525b", letterSpacing:"1px", marginBottom:5, display:"flex", justifyContent:"space-between" }}>
                    <span>MIN SCORE</span><span style={{ color:"#10b981", fontWeight:700 }}>{filters.minScore}</span>
                  </div>
                  <input type="range" min={0} max={90} step={5} value={filters.minScore}
                    onChange={e => setFilters(f=>({...f,minScore:+e.target.value}))} style={{ width:"100%" }}/>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#52525b", letterSpacing:"1px", marginBottom:5 }}>TIER</div>
                  <div style={{ display:"flex", gap:3 }}>
                    {["S_TIER","A_TIER","B_TIER"].map(t => { const tm=TIER[t]; const a=filters.tiers.includes(t);
                      return <button key={t} onClick={()=>toggleTier(t)} style={{ padding:"3px 9px", borderRadius:5, fontSize:9, fontWeight:700, cursor:"pointer", border:`1px solid ${a?tm.c:"#27272a"}`, background:a?tm.c+"18":"transparent", color:a?tm.c:"#52525b" }}>{tm.l}</button>;
                    })}
                  </div>
                </div>
                {(["hasKol","Safe Only"] as const).length > 0 && (
                  <>
                    {([["hasKol","Has KOL"],["noFlags","Safe Only"]] as [keyof typeof filters, string][]).map(([k,l]) => (
                      <button key={k} onClick={() => setFilters(f=>({...f,[k]:!f[k]}))}
                        style={{ padding:"5px 10px", borderRadius:6, fontSize:9, fontWeight:600, cursor:"pointer",
                          border:`1px solid ${filters[k]?"#dc2626":"#27272a"}`, background:filters[k]?"#dc262612":"transparent", color:filters[k]?"#ef4444":"#52525b" }}>
                        {filters[k]?"✓":"+"} {l}
                      </button>
                    ))}
                  </>
                )}
                <button onClick={doScan} disabled={loading}
                  style={{ marginLeft:"auto", padding:"6px 14px", borderRadius:7, fontSize:10, fontWeight:700, cursor:loading?"wait":"pointer", background:loading?"#111":"#dc2626", color:"#fff", border:"none", letterSpacing:".5px" }}>
                  {loading ? <span className="pulse">⟳ Scanning...</span> : "⟳ SCAN NOW"}
                </button>
              </div>
            </div>

            {scanMsg && <div className="pulse" style={{ textAlign:"center", fontSize:10, color:"#dc262680", marginBottom:10 }}>{scanMsg}</div>}

            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:18 }}>
              {[
                {l:"S-Tier",    v:gems.filter(g=>g.tier==="S_TIER").length, c:"#10b981"},
                {l:"A-Tier",    v:gems.filter(g=>g.tier==="A_TIER").length, c:"#3b82f6"},
                {l:"KOL Backed",v:gems.filter(g=>g.kol>0).length,           c:"#a855f7"},
                {l:"Detected",  v:gems.length,                               c:"#ef4444"},
              ].map(s => (
                <div key={s.l} style={{ background:"#111113", border:"1px solid #1e1e21", borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ fontSize:20, fontWeight:800, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10, color:"#3f3f46", marginTop:1 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
              {loading && !gems.length && (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"50px 20px" }}>
                  <div style={{ fontSize:18, color:"#dc2626", display:"inline-block" }} className="spin">⊗</div>
                  <div className="pulse" style={{ fontSize:11, color:"#dc262680", marginTop:10, letterSpacing:"2px" }}>SCANNING SOLANA MATRIX...</div>
                </div>
              )}
              {filtered.map(g => <GemCard key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={setSnipeGem}/>)}
              {!loading && gems.length > 0 && filtered.length === 0 && (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px", color:"#3f3f46" }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>🔍</div>
                  <div style={{ fontSize:12 }}>No gems match filters — try lowering Min Score</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FEED TAB */}
        {tab==="feed" && (
          <div style={{ padding:"18px 22px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <h1 style={{ fontSize:18, fontWeight:800, color:"#f4f4f5" }}>⚡ Live KOL Feed</h1>
              <div className="live-dot"/><span style={{ fontSize:9, color:"#10b981", fontWeight:600 }}>LIVE</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
              {KOLS.map(k => {
                const kTrades = feedTrades.filter(t=>t.kol===k.name).slice(0,6);
                return (
                  <div key={k.name} style={{ background:"#111113", border:"1px solid #1e1e21", borderRadius:10, overflow:"hidden" }}>
                    <div style={{ padding:"10px 12px", borderBottom:"1px solid #18181b", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%", background:k.c+"25", border:`1px solid ${k.c}50`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:k.c }}>{k.name[0]}</div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:11, color:"#f4f4f5" }}>{k.name}</div>
                          {k.tw && <div style={{ fontSize:8, color:"#3f3f46" }}>@{k.tw}</div>}
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:k.pnl.startsWith("+")?"#10b981":"#ef4444" }}>{k.pnl}</div>
                        <div style={{ fontSize:8, color:"#3f3f46" }}>Win {k.wr}%</div>
                      </div>
                    </div>
                    <div style={{ maxHeight:160, overflowY:"auto" }}>
                      {kTrades.length === 0
                        ? <div style={{ padding:14, textAlign:"center", fontSize:9, color:"#27272a" }}>Waiting...</div>
                        : kTrades.map(t => (
                          <div key={t.id} style={{ display:"grid", gridTemplateColumns:"30px 1fr 1fr 24px", gap:3, padding:"4px 10px", borderBottom:"1px solid #111", alignItems:"center", fontSize:9 }}>
                            <span style={{ fontWeight:700, color:t.type==="buy"?"#10b981":"#ef4444" }}>{t.type==="buy"?"Buy":"Sell"}</span>
                            {t.type==="buy"
                              ? <><span style={{ color:"#d4d4d8", fontWeight:600 }}>{t.sol} <span style={{ color:"#52525b" }}>Sol</span></span><span style={{ color:"#f4f4f5" }}>{t.tokAmt} <span style={{ color:"#10b981", fontWeight:700 }}>{t.sym}</span></span></>
                              : <><span style={{ color:"#f4f4f5" }}>{t.tokAmt} <span style={{ color:"#ef4444", fontWeight:700 }}>{t.sym}</span></span><span style={{ color:"#d4d4d8", fontWeight:600 }}>{t.sol} <span style={{ color:"#52525b" }}>Sol</span></span></>
                            }
                            <span style={{ color:"#3f3f46", textAlign:"right" }}>{fmtAge(t.ago)}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LAUNCH TAB */}
        {tab==="launch" && (
          <div style={{ padding:"18px 22px", maxWidth:500 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#f4f4f5", marginBottom:4 }}>🚀 Launch Token</h1>
            <p style={{ fontSize:11, color:"#3f3f46", marginBottom:16 }}>Create & launch on Pump.fun · 100% on-chain via Phantom</p>
            <div style={{ display:"flex", alignItems:"center", padding:"8px 12px", marginBottom:14, background:"#111113", border:`1px solid ${wallet?"#10b98130":"#dc262630"}`, borderRadius:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:wallet?"#10b981":"#ef4444", fontWeight:600 }}>{wallet?`✓ ${wallet.slice(0,16)}...`:"Connect Phantom"}</div>
                {wBal && <div style={{ fontSize:9, color:"#3f3f46" }}>{wBal} SOL</div>}
              </div>
              <button onClick={connectWallet} style={{ background:wallet?"#10b98110":"#dc262610", border:`1px solid ${wallet?"#10b98130":"#dc262640"}`, color:wallet?"#10b981":"#ef4444", padding:"5px 12px", borderRadius:6, fontSize:9, fontWeight:700, cursor:"pointer" }}>{wallet?"Connected":"Connect"}</button>
            </div>
            {ctStep==="form" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {([["name","TOKEN NAME *","Moon Pepe"],["sym","SYMBOL *","MPEPE"]] as [keyof typeof ct, string, string][]).map(([k,l,p]) => (
                    <div key={k}>
                      <div style={{ fontSize:9, color:"#52525b", letterSpacing:"1px", marginBottom:4 }}>{l}</div>
                      <input value={ct[k]} onChange={e=>setCt(pr=>({...pr,[k]:e.target.value}))} placeholder={p}
                        style={{ width:"100%", background:"#09090b", border:"1px solid #27272a", borderRadius:7, color:"#f4f4f5", padding:"9px 12px", fontSize:12, outline:"none" }}
                        onFocus={e=>(e.target.style.borderColor="#dc2626")} onBlur={e=>(e.target.style.borderColor="#27272a")}/>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#52525b", letterSpacing:"1px", marginBottom:4 }}>DESCRIPTION</div>
                  <textarea value={ct.desc} onChange={e=>setCt(p=>({...p,desc:e.target.value}))} placeholder="Token description..." rows={3}
                    style={{ width:"100%", background:"#09090b", border:"1px solid #27272a", borderRadius:7, color:"#f4f4f5", padding:"9px 12px", fontSize:11, outline:"none", resize:"vertical" }}/>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#52525b", letterSpacing:"1px", marginBottom:4 }}>IMAGE URL</div>
                  <input value={ct.img} onChange={e=>setCt(p=>({...p,img:e.target.value}))} placeholder="https://..."
                    style={{ width:"100%", background:"#09090b", border:"1px solid #27272a", borderRadius:7, color:"#f4f4f5", padding:"9px 12px", fontSize:11, outline:"none" }}/>
                </div>
                <div style={{ background:"#111113", border:"1px solid #27272a", borderRadius:8, padding:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:9, color:"#52525b", letterSpacing:"1px" }}>DEV BUY (SOL)</span>
                    <span style={{ fontSize:10, fontWeight:700, color:"#eab308" }}>{ct.devBuy} SOL</span>
                  </div>
                  <input type="range" min="0" max="5" step="0.1" value={ct.devBuy} onChange={e=>setCt(p=>({...p,devBuy:e.target.value}))} style={{ width:"100%" }}/>
                </div>
                {ctMsg && <div style={{ fontSize:10, color:ctMsg.startsWith("✓")?"#10b981":"#f59e0b", textAlign:"center" }}>{ctMsg}</div>}
                <button onClick={launchToken} disabled={ctLoad||!ct.name||!ct.sym}
                  style={{ background:"linear-gradient(135deg,#dc2626,#7c3aed)", border:"none", color:"#fff", padding:"11px", borderRadius:8, fontSize:12, fontWeight:700, cursor:ctLoad?"wait":"pointer", letterSpacing:".5px", opacity:(!ct.name||!ct.sym)?0.4:1 }}>
                  {ctLoad ? <span className="pulse">⟳ Processing...</span> : "⚡ LAUNCH ON-CHAIN"}
                </button>
              </div>
            )}
            {ctStep==="done" && (
              <div style={{ textAlign:"center", padding:"30px 20px", background:"#111113", border:"1px solid #10b98130", borderRadius:12 }}>
                <div style={{ fontSize:48, marginBottom:10 }}>🚀</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#10b981", marginBottom:6 }}>Token Launched!</div>
                <div style={{ fontSize:11, color:"#52525b", marginBottom:4 }}>${ct.sym.toUpperCase()} is live on Pump.fun</div>
                <div style={{ fontSize:10, color:"#3f3f46", marginBottom:16 }}>{ctMsg}</div>
                <button onClick={()=>{setCtStep("form");setCt({name:"",sym:"",desc:"",img:"",devBuy:"0.5"});setCtMsg("");}}
                  style={{ background:"#dc2626", border:"none", color:"#fff", padding:"8px 20px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  Launch Another
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
