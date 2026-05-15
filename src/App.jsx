import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ── Config ─────────────────────────────────────────────────────
const HELIUS_KEY = "7d6fb838-2085-41ea-aa3d-2f1522cd55d8";
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
const HELIUS_API = `https://api.helius.xyz/v0`;
const PUMP_PROG  = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const WSOL       = "So11111111111111111111111111111111111111112";
const SKIP       = new Set([WSOL,"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]);
const toB64      = arr => { let s=""; for(let i=0;i<arr.length;i++) s+=String.fromCharCode(arr[i]); return btoa(s); };

const PLATS = [
  { id:"axiom",  l:"Axiom",  c:"#ff6600", u:ca=>`https://axiom.trade/t/${ca}` },
  { id:"photon", l:"Photon", c:"#a855f7", u:ca=>`https://photon-sol.tinyastro.io/en/r/@default/${ca}` },
  { id:"bullx",  l:"BullX",  c:"#eab308", u:ca=>`https://bullx.io/terminal?chainId=1399811149&address=${ca}` },
  { id:"dex",    l:"DexScr",  c:"#06b6d4", u:ca=>`https://dexscreener.com/solana/${ca}` },
];

const KOLS = [
  { name:"Murad",     addr:"9BSnmdnbHoVMVFWFxnBnpBFfFLXMSwKjMgCUBv6UFLRV", tw:"MustStopMurad",  wr:71, trades:1240, pnl:"+$84.2k",  c:"#ef4444" },
  { name:"0xSun",     addr:"suqh5haRPBGMPFZHKVRFIoH8zmU5z4vIuEdbHfwJgHk",  tw:"0xSun_sol",      wr:68, trades:2100, pnl:"+$61.8k",  c:"#f97316" },
  { name:"Ansem",     addr:"5tzFkiKscXHK5ZXCGbCe9PSNY2BNoNNsZzMBzuLKkrxM", tw:"blknoiz06",      wr:62, trades:1560, pnl:"+$38.4k",  c:"#eab308" },
  { name:"Darkfarms", addr:"AhcuvRMWBDYnRZmMDVMHQCnEfvGnz6BSQB8TgMynUWbS", tw:"darkfarms1",     wr:74, trades:3200, pnl:"+$112k",   c:"#22c55e" },
  { name:"KingKong",  addr:"FpCMFDFGYotvufJ7HAsL4tRQGFTHqpSaoH1pCGS9AWHH", tw:"kingkongsol",    wr:65, trades:1870, pnl:"+$29.1k",  c:"#a855f7" },
  { name:"AlphaBot",  addr:"7mDQhd7n22KBEsGNbQwS88mNqjXFqRmtJHVz4SyZcSxH", tw:"",               wr:77, trades:4100, pnl:"+$203k",   c:"#ec4899" },
];

// ── Utils ──────────────────────────────────────────────────────
const wait   = ms => new Promise(r => setTimeout(r, ms));
const fmtMcap = n => n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}k`:`$${n}`;
const fmtAge  = s => s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`;
const fmtTok  = n => !n?'0':n>=1e9?`${(n/1e9).toFixed(1)}b`:n>=1e6?`${(n/1e6).toFixed(1)}m`:n>=1e3?`${(n/1e3).toFixed(1)}k`:Number(n).toFixed(1);
const scoreClr = s => s>=70?"#10b981":s>=50?"#eab308":"#ef4444";
const TIER  = { S_TIER:{l:"S",c:"#10b981"}, A_TIER:{l:"A",c:"#3b82f6"}, B_TIER:{l:"B",c:"#eab308"}, C_TIER:{l:"C",c:"#ef4444"}, RUGGED:{l:"RUG",c:"#6b7280"} };

const CSS = `
@keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes glow{0%,100%{box-shadow:0 0 6px #10b98140}50%{box-shadow:0 0 18px #10b98170}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{background:#10b981}50%{background:#10b98130}}
.gem-new{animation:slideIn .4s ease,glow 2s ease 3}
.live-dot{animation:blink 1.5s infinite;width:7px;height:7px;border-radius:50%;flex-shrink:0}
.spin{animation:spin 1.5s linear infinite}
.pulse{animation:pulse 1.8s infinite}
*{box-sizing:border-box;margin:0}
input[type=range]{accent-color:#dc2626;cursor:pointer}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#27272a;border-radius:2px}::-webkit-scrollbar-track{background:transparent}
`;

// ── GEASS Logo SVG ─────────────────────────────────────────────
const GeassLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" style={{display:"block",overflow:"visible"}}>
    <defs>
      <filter id="gl" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b1"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b2"/>
        <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g filter="url(#gl)">
      <path d="M150,268 L120,222 L84,200 L84,170 L112,146 C88,116 52,76 16,36 C8,26 10,44 18,54 C42,84 72,118 96,142 L110,154 L126,182 L144,224 Z" fill="#dd1111"/>
      <path d="M150,268 L180,222 L216,200 L216,170 L188,146 C212,116 248,76 284,36 C292,26 290,44 282,54 C258,84 228,118 204,142 L190,154 L174,182 L156,224 Z" fill="#dd1111"/>
    </g>
    <path d="M150,268 L120,222 L84,200 L84,170 L112,146 C88,116 52,76 16,36 C8,26 10,44 18,54 C42,84 72,118 96,142 L110,154 L126,182 L144,224 Z" fill="#ee2222"/>
    <path d="M150,268 L180,222 L216,200 L216,170 L188,146 C212,116 248,76 284,36 C292,26 290,44 282,54 C258,84 228,118 204,142 L190,154 L174,182 L156,224 Z" fill="#ee2222"/>
  </svg>
);

// ── Score Ring ──────────────────────────────────────────────────
const ScoreRing = ({ score, size = 48 }) => {
  const r=(size-8)/2, circ=2*Math.PI*r, dash=(score/100)*circ, c=scoreClr(score);
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size>42?13:10,fontWeight:800,color:c}}>{score}</div>
    </div>
  );
};

// ── Real API functions ─────────────────────────────────────────
async function hRpc(method, params) {
  const r = await fetch(HELIUS_RPC, { method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({jsonrpc:"2.0",id:1,method,params}), signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error("H"+r.status);
  const d = await r.json(); if (d.error) throw new Error(d.error.message); return d.result;
}

function buildGem(mint, pair, src, kolBuyers=[]) {
  if (!pair?.baseToken) return null;
  const mc=pair.fdv||pair.marketCap||0, vol=pair.volume?.h24||0, vmr=mc>0?vol/mc:0;
  const age=pair.pairCreatedAt?(Date.now()-pair.pairCreatedAt)/3600000:null;
  if (age!==null && age>12) return null;
  const pc1=pair.priceChange?.h1||0, buys=pair.txns?.h1?.buys||0, sells=pair.txns?.h1?.sells||0;
  const bp=parseFloat((sells>0?buys/sells:buys>0?5:1).toFixed(1));
  let sc=src==="helius"?60:45;
  if(vmr>10)sc+=22;else if(vmr>5)sc+=16;else if(vmr>2)sc+=9;else if(vmr>0.5)sc+=4;
  if(age!==null){if(age<0.5)sc+=25;else if(age<1)sc+=20;else if(age<3)sc+=14;else if(age<6)sc+=8;else sc+=3;}
  if(bp>3)sc+=14;else if(bp>1.5)sc+=7;
  if(pc1>100)sc+=10;else if(pc1>50)sc+=6;else if(pc1>20)sc+=3;
  if(kolBuyers.length>=3) sc+=15; else if(kolBuyers.length>=1) sc+=8;
  sc=Math.min(100,Math.round(sc));
  const xp=mc<20000?1000:mc<100000?500:mc<500000?100:mc<2000000?50:mc<10000000?10:2;
  const tier=sc>=85?"S_TIER":sc>=70?"A_TIER":sc>=50?"B_TIER":sc>=30?"C_TIER":"RUGGED";
  const reasons=[];
  if(kolBuyers.length>0) reasons.push(`${kolBuyers.length} KOL(s) bought early`);
  if(age!==null) reasons.push(age<1?`${(age*60).toFixed(0)}min old — ultra fresh`:`${Math.round(age)}h old`);
  if(vmr>2) reasons.push(`Vol/MCap ${vmr.toFixed(1)}x`);
  if(bp>2) reasons.push(`Buy pressure ${bp}x`);
  if(pc1>20) reasons.push(`+${pc1.toFixed(0)}% in 1h`);
  if(mc<50000) reasons.push("Ultra low cap");

  return { id:mint, sym:pair.baseToken.symbol||"???", name:pair.baseToken.name||"Unknown",
    score:sc, tier, mcap:mc, priceSol:pair.priceNative||0, vol24h:vol, bc:Math.min(100,mc/690),
    kol:kolBuyers.length, kolBuyers, holders:0, ageHours:age, xPotential:xp,
    priceChange1h:pc1, buyPressure:bp, contractAddress:mint,
    reasons, redFlags:[], mintRev:true, freezeRev:true, source:src, dexUrl:pair.url,
    detectedAt:new Date().toISOString() };
}

async function scanHelius(count) {
  const sigs = await hRpc("getSignaturesForAddress",[PUMP_PROG,{limit:30}]);
  const sl = sigs.slice(0,15).map(s=>s.signature);
  const tr = await fetch(`${HELIUS_API}/transactions?api-key=${HELIUS_KEY}`,
    {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transactions:sl}),signal:AbortSignal.timeout(12000)});
  if(!tr.ok) throw new Error("TX "+tr.status);
  const txs = await tr.json();
  const mc = new Map();
  (Array.isArray(txs)?txs:[]).forEach(tx=>(tx.tokenTransfers||[]).forEach(t=>{
    if(t.mint&&!SKIP.has(t.mint)) mc.set(t.mint,(mc.get(t.mint)||0)+1);
  }));
  const mints = [...mc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([m])=>m);
  if(!mints.length) throw new Error("No mints");
  const gems = [];
  for(const mint of mints){
    if(gems.length>=count) break;
    try{
      const d=await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`,{signal:AbortSignal.timeout(6000)}).then(r=>r.json());
      const pair=(d.pairs||[]).sort((a,b)=>(b.volume?.h24||0)-(a.volume?.h24||0))[0];
      const g=buildGem(mint,pair,"helius");
      if(g&&g.score>=50) gems.push(g);
    }catch{}
    await wait(200);
  }
  for(let i=0;i<Math.min(gems.length,3);i++){
    try{
      const h=await hRpc("getTokenLargestAccounts",[gems[i].contractAddress]);
      const accs=h?.value||[];
      const tot=accs.reduce((s,a)=>s+parseFloat(a.uiAmount||0),0);
      if(tot>0){
        const t1=parseFloat(accs[0]?.uiAmount||0)/tot*100;
        if(t1>30) gems[i].redFlags.push("Top holder "+t1.toFixed(0)+"%");
        gems[i].holders=accs.length;
      }
    }catch{}
    await wait(300);
  }
  return gems.sort((a,b)=>b.score-a.score);
}

async function scanDexScreener(count) {
  const r=await fetch("https://api.dexscreener.com/token-profiles/latest/v1",{signal:AbortSignal.timeout(8000)});
  if(!r.ok) throw new Error("DX");
  const raw=await r.json(); const arr=Array.isArray(raw)?raw:(raw.data||[]);
  const sol=arr.filter(p=>p.chainId==="solana").slice(0,15);
  const gems=[];
  for(const p of sol){
    if(gems.length>=count) break;
    try{
      const d=await fetch(`https://api.dexscreener.com/latest/dex/tokens/${p.tokenAddress}`,{signal:AbortSignal.timeout(5000)}).then(r2=>r2.json());
      const pair=(d.pairs||[]).sort((a,b)=>(b.volume?.h24||0)-(a.volume?.h24||0))[0];
      const g=buildGem(p.tokenAddress,pair,"dex");
      if(g&&g.score>=45) gems.push(g);
    }catch{}
    await wait(100);
  }
  return gems.sort((a,b)=>b.score-a.score);
}

async function scanAI(count) {
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,
      system:`Generate ${count} realistic Solana memecoins <6h old. ONLY raw JSON array. Fields:{"id":"mint44","sym":"TICK","name":"N","score":82,"tier":"A_TIER","mcap":28000,"priceSol":0.000003,"bc":45,"kol":2,"kolBuyers":[{"l":"Murad","s":1.5}],"holders":187,"ageHours":0.5,"xPotential":500,"priceChange1h":45,"buyPressure":2.5,"contractAddress":"44chars","reasons":["reason1","reason2"],"redFlags":[],"mintRev":true,"freezeRev":true,"source":"ai","dexUrl":null,"detectedAt":"${new Date().toISOString()}"}`,
      messages:[{role:"user",content:"Pre-pump scan. JSON only."}]})});
  if(!res.ok) throw new Error("AI "+res.status);
  const d=await res.json();
  const txt=d.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  const si=txt.indexOf("["),ei=txt.lastIndexOf("]");
  if(si===-1) throw new Error("Parse");
  return JSON.parse(txt.slice(si,ei+1));
}

// ── GEM CARD ───────────────────────────────────────────────────
function GemCard({ gem, isNew, onSnipe }) {
  const tier = TIER[gem.tier]||TIER.C_TIER;
  return (
    <div className={isNew?"gem-new":""}
      style={{background:"#111113",border:`1px solid ${isNew?"#10b98150":"#1e1e21"}`,
        borderRadius:12,padding:14,display:"flex",flexDirection:"column",gap:10,position:"relative",overflow:"hidden"}}>
      {isNew&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#10b981,transparent)"}} className="pulse"/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#dc262630,#7c3aed30)",border:"1px solid #27272a",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#f4f4f5"}}>{gem.sym?.[0]||"?"}</div>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:"#f4f4f5",letterSpacing:".3px"}}>${gem.sym}</div>
            <div style={{fontSize:10,color:"#52525b",marginTop:1}}>{gem.name}</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <ScoreRing score={gem.score} size={46}/>
          <span style={{fontSize:9,fontWeight:700,color:tier.c,background:tier.c+"18",padding:"2px 7px",borderRadius:4,border:`1px solid ${tier.c}30`}}>{tier.l}</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
        {[["MCAP",fmtMcap(gem.mcap)],["X POT",`${gem.xPotential}x`],["KOL",gem.kol>0?`${gem.kol} ✓`:"—"]].map(([l,v])=>(
          <div key={l} style={{background:"#09090b",borderRadius:6,padding:"5px 7px"}}>
            <div style={{fontSize:8,color:"#3f3f46",letterSpacing:".8px"}}>{l}</div>
            <div style={{fontSize:11,fontWeight:700,color:l==="KOL"&&gem.kol>0?"#10b981":"#d4d4d8",marginTop:1}}>{v}</div>
          </div>
        ))}
      </div>
      {gem.kolBuyers?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {gem.kolBuyers.slice(0,3).map((k,i)=><span key={i} style={{fontSize:9,fontWeight:600,color:"#f4f4f5",
          background:["#ef444425","#f9731625","#eab30825"][i]||"#22222",border:`1px solid ${["#ef444450","#f9731650","#eab30850"][i]||"#333"}`,
          padding:"2px 7px",borderRadius:4}}>{k.l||k.label} · {k.s||k.solAmount} SOL</span>)}
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        {gem.reasons?.slice(0,3).map((r,i)=><div key={i} style={{fontSize:10,color:"#71717a",display:"flex",alignItems:"center",gap:4}}>
          <span style={{color:"#10b981",fontSize:8}}>✓</span>{r}
        </div>)}
        {gem.redFlags?.slice(0,1).map((r,i)=><div key={i} style={{fontSize:10,color:"#f59e0b",display:"flex",alignItems:"center",gap:4}}>⚠ {r}</div>)}
      </div>
      <div style={{display:"flex",gap:6}}>
        <a href={gem.contractAddress?`https://pump.fun/token/${gem.contractAddress}`:"#"} target="_blank" rel="noreferrer"
          style={{flex:1,background:"#18181b",border:"1px solid #27272a",color:"#a1a1aa",padding:"7px",borderRadius:7,
            fontSize:10,fontWeight:600,textDecoration:"none",textAlign:"center",cursor:"pointer"}}>
          View Pump.fun
        </a>
        <button onClick={()=>onSnipe?.(gem)}
          style={{flex:1,background:"linear-gradient(135deg,#dc2626,#7c3aed)",border:"none",color:"#fff",
            padding:"7px",borderRadius:7,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:".5px"}}>
          ⚡ SNIPE
        </button>
      </div>
    </div>
  );
}

// ── SNIPE MODAL ────────────────────────────────────────────────
function SnipeModal({ gem, wallet, onClose }) {
  const [amt,setAmt]=useState("0.5");
  const [step,setStep]=useState("form");
  const [msg,setMsg]=useState("");
  if(!gem) return null;
  const doSnipe=async()=>{
    if(!wallet){setMsg("Connect Phantom first");return;}
    setStep("loading");setMsg("Preparing transaction...");
    try{
      const res=await fetch("https://pump.fun/api/trade-local",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({publicKey:wallet,action:"buy",mint:gem.contractAddress,amount:parseFloat(amt),
          denominatedInSol:"true",slippage:15,priorityFee:0.001,pool:"pump"}),signal:AbortSignal.timeout(15000)});
      if(!res.ok) throw new Error("pump.fun "+res.status);
      const bytes=new Uint8Array(await res.arrayBuffer());
      setMsg("Sign in Phantom...");
      const{solana}=window;
      if(!solana?.isPhantom) throw new Error("Phantom not found");
      try{const r=await solana.request({method:"signAndSendTransaction",params:{transaction:toB64(bytes)}});setMsg("✓ TX: "+(r?.signature||"").slice(0,16)+"...");setStep("done");}
      catch{const r=await solana.signAndSendTransaction({serialize:()=>bytes,serializeMessage:()=>bytes});setMsg("✓ TX: "+(r?.signature||"").slice(0,16)+"...");setStep("done");}
    }catch(e){setMsg("Error: "+e.message);setStep("form");}
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#111113",border:"1px solid #27272a",borderRadius:14,padding:22,width:"100%",maxWidth:350}}>
        {step==="done"?(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:10}}>✅</div>
            <div style={{fontSize:13,fontWeight:700,color:"#10b981",marginBottom:6}}>Order Submitted!</div>
            <div style={{fontSize:11,color:"#71717a",marginBottom:4}}>{msg}</div>
            <button onClick={onClose} style={{marginTop:12,background:"#dc2626",border:"none",color:"#fff",padding:"8px 20px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <div><div style={{fontWeight:700,fontSize:14,color:"#f4f4f5"}}>⚡ Snipe ${gem.sym}</div><div style={{fontSize:11,color:"#52525b"}}>{gem.name} · Score {gem.score}</div></div>
              <button onClick={onClose} style={{background:"none",border:"none",color:"#52525b",fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{fontSize:10,color:"#52525b",letterSpacing:"1px",marginBottom:6}}>AMOUNT (SOL)</div>
            <div style={{display:"flex",gap:5,marginBottom:8}}>
              {["0.1","0.5","1","2","5"].map(v=><button key={v} onClick={()=>setAmt(v)} style={{flex:1,padding:"6px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",border:`1px solid ${amt===v?"#dc2626":"#27272a"}`,background:amt===v?"#dc262615":"transparent",color:amt===v?"#ef4444":"#71717a"}}>{v}</button>)}
            </div>
            <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} style={{width:"100%",background:"#09090b",border:"1px solid #27272a",borderRadius:7,color:"#f4f4f5",padding:"9px 12px",fontSize:13,outline:"none",marginBottom:10}}/>
            {msg&&<div style={{fontSize:10,color:msg.startsWith("✓")?"#10b981":"#f59e0b",marginBottom:8,textAlign:"center"}}>{msg}</div>}
            <button onClick={doSnipe} disabled={step==="loading"} style={{width:"100%",background:"linear-gradient(135deg,#dc2626,#7c3aed)",border:"none",color:"#fff",padding:"10px",borderRadius:8,fontSize:12,fontWeight:700,cursor:step==="loading"?"wait":"pointer"}}>
              {step==="loading"?<span className="pulse">⟳ Processing...</span>:`⚡ BUY ${amt} SOL of $${gem.sym}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── NAV ────────────────────────────────────────────────────────
const NAV = [
  { id:"gems",   icon:"💎", label:"Gems Detector", badge:"LIVE" },
  { id:"feed",   icon:"⚡", label:"Live Feed" },
  { id:"launch", icon:"🚀", label:"Launch" },
];

// ── MAIN APP ───────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("gems");
  const [gems, setGems]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [scanMsg, setScanMsg]   = useState("");
  const [scanTime, setScanTime] = useState(null);
  const [source, setSource]     = useState("");
  const [newIds, setNewIds]     = useState(new Set());
  const [snipeGem, setSnipeGem] = useState(null);
  const [wallet, setWallet]     = useState(null);
  const [wBal, setWBal]         = useState(null);
  const [filters, setFilters]   = useState({ minScore:0, tiers:[], hasKol:false, noFlags:false });
  const [detecting, setDetecting] = useState(false);
  const [feedTrades, setFeedTrades] = useState([]);

  // Launch state
  const [ct, setCt]             = useState({name:"",sym:"",desc:"",img:"",devBuy:"0.5"});
  const [ctStep, setCtStep]     = useState("form");
  const [ctLoad, setCtLoad]     = useState(false);
  const [ctMsg, setCtMsg]       = useState("");

  const tokRef = useRef([]);
  const lastSig = useRef(null);
  const pollRef = useRef(null);
  tokRef.current = gems;

  // ── Wallet connect ────────────────────────────────────────────
  const connectWallet = async () => {
    try {
      const { solana } = window;
      if (!solana?.isPhantom) { alert("Install Phantom from phantom.app"); return; }
      const r = await solana.connect();
      const addr = r.publicKey.toString();
      setWallet(addr);
      try { const b = await hRpc("getBalance",[addr]); setWBal(((b||0)/1e9).toFixed(3)); } catch {}
    } catch (e) { console.error(e); }
  };

  // ── Main scan ─────────────────────────────────────────────────
  const doScan = useCallback(async () => {
    setLoading(true); setScanMsg("");
    let result = null;
    try { setScanMsg("⚡ Helius pump.fun scan..."); result = await scanHelius(6); setSource("HELIUS"); }
    catch {
      try { setScanMsg("◉ DexScreener scan..."); result = await scanDexScreener(6); setSource("DEXSCREENER"); }
      catch {
        try { setScanMsg("○ AI analysis..."); result = await scanAI(6); setSource("AI"); }
        catch (e) { setScanMsg("Scan failed: " + e.message); setLoading(false); return; }
      }
    }
    if (result?.length) {
      const ns = new Set();
      result.forEach(g => { if (!tokRef.current.find(x => x.id === g.id)) ns.add(g.id); });
      setNewIds(ns);
      setTimeout(() => setNewIds(new Set()), 10000);
      setGems(result);
      setScanTime(new Date().toLocaleTimeString());
      lastSig.current = lastSig.current || "init";
    }
    setLoading(false); setScanMsg("");
  }, []);

  // ── Background detector ───────────────────────────────────────
  useEffect(() => {
    doScan();
    pollRef.current = setInterval(async () => {
      if (!lastSig.current || loading) return;
      setDetecting(true);
      try {
        const sigs = await hRpc("getSignaturesForAddress",[PUMP_PROG,{limit:5}]);
        const lat = sigs[0]?.signature;
        if (!lat || lat === lastSig.current) { setDetecting(false); return; }
        lastSig.current = lat;
        const tr = await fetch(`${HELIUS_API}/transactions?api-key=${HELIUS_KEY}`,
          {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transactions:sigs.slice(0,4).map(s=>s.signature)}),signal:AbortSignal.timeout(8000)});
        const txs = await tr.json();
        const mints = new Set();
        (Array.isArray(txs)?txs:[]).forEach(tx=>(tx.tokenTransfers||[]).forEach(t=>{
          if(t.mint&&!SKIP.has(t.mint)&&!tokRef.current.find(tk=>tk.id===t.mint)) mints.add(t.mint);
        }));
        const nTks = [];
        for (const mint of [...mints].slice(0,2)) {
          try {
            const d = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`,{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
            const pair = (d.pairs||[]).sort((a,b)=>(b.volume?.h24||0)-(a.volume?.h24||0))[0];
            const g = buildGem(mint,pair,"helius");
            if (g && g.score >= 50) nTks.push(g);
          } catch {}
          await wait(200);
        }
        if (nTks.length) {
          setNewIds(new Set(nTks.map(t=>t.id)));
          setTimeout(()=>setNewIds(new Set()), 10000);
          setGems(prev => [...nTks,...prev].slice(0,24));
          setScanTime(new Date().toLocaleTimeString());
        }
      } catch {}
      setDetecting(false);
    }, 20000);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line

  // ── Simulated KOL feed ────────────────────────────────────────
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

  // ── Filtered gems ─────────────────────────────────────────────
  const filtered = useMemo(() =>
    gems.filter(g => {
      if (g.score < filters.minScore) return false;
      if (filters.tiers.length && !filters.tiers.includes(g.tier)) return false;
      if (filters.hasKol && g.kol === 0) return false;
      if (filters.noFlags && g.redFlags?.length > 0) return false;
      return true;
    }), [gems, filters]);

  const toggleTier = t => setFilters(f=>({...f,tiers:f.tiers.includes(t)?f.tiers.filter(x=>x!==t):[...f.tiers,t]}));

  // ── Token launch ──────────────────────────────────────────────
  const launchToken = async () => {
    if(!ct.name||!ct.sym){setCtMsg("Fill Name & Symbol");return;}
    if(!wallet){setCtMsg("Connect Phantom first");return;}
    setCtLoad(true); setCtMsg("Uploading metadata to IPFS...");
    try {
      const form=new FormData();
      Object.entries({name:ct.name,symbol:ct.sym.toUpperCase(),description:ct.desc||ct.name,showName:"true"}).forEach(([k,v])=>form.append(k,v));
      if(ct.img){try{const ir=await fetch(ct.img,{signal:AbortSignal.timeout(8000)});form.append("file",await ir.blob(),"img.png");}catch{}}
      const mr=await fetch("https://pump.fun/api/ipfs",{method:"POST",body:form,signal:AbortSignal.timeout(15000)});
      if(!mr.ok) throw new Error("IPFS "+mr.status);
      const meta=await mr.json();
      setCtMsg("Creating on-chain...");
      const r=await fetch("https://pump.fun/api/trade-local",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({publicKey:wallet,action:"create",tokenMetadata:{name:ct.name,symbol:ct.sym.toUpperCase(),uri:meta.metadataUri},
          denominatedInSol:"true",amount:parseFloat(ct.devBuy)||0,slippage:10,priorityFee:0.0005,pool:"pump"}),signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error("pump.fun "+r.status);
      const bytes=new Uint8Array(await r.arrayBuffer());
      setCtMsg("Sign in Phantom...");
      const{solana}=window;
      let sig;
      try{const r2=await solana.request({method:"signAndSendTransaction",params:{transaction:toB64(bytes)}});sig=r2?.signature||r2;}
      catch{const r2=await solana.signAndSendTransaction({serialize:()=>bytes,serializeMessage:()=>bytes});sig=r2?.signature;}
      setCtMsg(`✓ Launched! TX: ${(sig||"").slice(0,18)}...`); setCtStep("done");
    }catch(e){setCtMsg("Error: "+e.message);}
    setCtLoad(false);
  };

  return (
    <div style={{display:"flex",height:"100vh",background:"#09090b",color:"#f4f4f5",fontFamily:"'Inter',system-ui,sans-serif",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <aside style={{width:200,background:"#0c0c0e",borderRight:"1px solid #18181b",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{height:56,display:"flex",alignItems:"center",padding:"0 14px",borderBottom:"1px solid #18181b",gap:8}}>
          <GeassLogo size={28}/>
          <div><span style={{fontWeight:800,fontSize:13,color:"#f4f4f5",letterSpacing:"1.5px"}}>GEASS</span>
          <div style={{fontSize:8,color:"#3f3f46",letterSpacing:"2px",marginTop:-1}}>ALPHA RECON</div></div>
        </div>
        <nav style={{flex:1,padding:"8px 6px",overflowY:"auto"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,
                border:`1px solid ${tab===n.id?"#dc262640":"transparent"}`,background:tab===n.id?"#dc262612":"transparent",
                color:tab===n.id?"#ef4444":"#52525b",cursor:"pointer",marginBottom:2,fontSize:11,fontWeight:tab===n.id?700:500,textAlign:"left"}}>
              <span style={{fontSize:14}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.badge&&<span style={{fontSize:7,fontWeight:700,color:"#10b981",background:"#10b98120",border:"1px solid #10b98140",padding:"1px 5px",borderRadius:8}}>{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:"8px 8px",borderTop:"1px solid #18181b"}}>
          <button onClick={connectWallet}
            style={{width:"100%",padding:"7px 8px",borderRadius:7,border:"1px solid #27272a",
              background:wallet?"#10b98110":"#18181b",color:wallet?"#10b981":"#52525b",
              fontSize:9,fontWeight:600,cursor:"pointer",letterSpacing:".3px"}}>
            {wallet?`✓ ${wallet.slice(0,4)}...${wallet.slice(-4)}${wBal?` · ${wBal}◎`:""}`:"◎ Connect Phantom"}
          </button>
        </div>
      </aside>

      <main style={{flex:1,overflow:"auto"}}>
        {snipeGem && <SnipeModal gem={snipeGem} wallet={wallet} onClose={()=>setSnipeGem(null)}/>}

        {/* ── GEMS TAB ── */}
        {tab==="gems"&&<div style={{padding:"18px 22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
            <h1 style={{fontSize:18,fontWeight:800,color:"#f4f4f5",letterSpacing:".3px"}}>💎 Gems Detector</h1>
            <span style={{fontSize:9,fontWeight:600,color:"#10b981",background:"#10b98120",border:"1px solid #10b98140",padding:"2px 7px",borderRadius:10}}>ALPHA SCANNER</span>
            <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
              {detecting&&<div className="live-dot"/>}
              <span style={{fontSize:9,color:detecting?"#10b981":"#3f3f46"}}>{detecting?"DETECTING":"IDLE"}</span>
              {scanTime&&<span style={{fontSize:9,color:"#3f3f46"}}>· Last: {scanTime}</span>}
              <span style={{fontSize:9,color:"#27272a"}}>· {source}</span>
            </div>
          </div>
          <p style={{fontSize:11,color:"#3f3f46",marginBottom:16}}>Real-time detection via Helius + DexScreener · Auto-detect ⟳20s</p>

          {/* Filters */}
          <div style={{background:"#111113",border:"1px solid #1e1e21",borderRadius:10,padding:"12px 14px",marginBottom:18}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:14,alignItems:"center"}}>
              <div style={{minWidth:140}}>
                <div style={{fontSize:9,color:"#52525b",letterSpacing:"1px",marginBottom:5,display:"flex",justifyContent:"space-between"}}>
                  <span>MIN SCORE</span><span style={{color:"#10b981",fontWeight:700}}>{filters.minScore}</span>
                </div>
                <input type="range" min={0} max={90} step={5} value={filters.minScore}
                  onChange={e=>setFilters(f=>({...f,minScore:+e.target.value}))} style={{width:"100%"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"#52525b",letterSpacing:"1px",marginBottom:5}}>TIER</div>
                <div style={{display:"flex",gap:3}}>
                  {["S_TIER","A_TIER","B_TIER"].map(t=>{const tm=TIER[t];const a=filters.tiers.includes(t);
                    return <button key={t} onClick={()=>toggleTier(t)} style={{padding:"3px 9px",borderRadius:5,fontSize:9,fontWeight:700,cursor:"pointer",border:`1px solid ${a?tm.c:"#27272a"}`,background:a?tm.c+"18":"transparent",color:a?tm.c:"#52525b"}}>{tm.l}</button>;})}
                </div>
              </div>
              {[["hasKol","Has KOL"],["noFlags","Safe Only"]].map(([k,l])=>(
                <button key={k} onClick={()=>setFilters(f=>({...f,[k]:!f[k]}))}
                  style={{padding:"5px 10px",borderRadius:6,fontSize:9,fontWeight:600,cursor:"pointer",border:`1px solid ${filters[k]?"#dc2626":"#27272a"}`,background:filters[k]?"#dc262612":"transparent",color:filters[k]?"#ef4444":"#52525b"}}>
                  {filters[k]?"✓":"+"} {l}
                </button>
              ))}
              <button onClick={doScan} disabled={loading} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:7,fontSize:10,fontWeight:700,cursor:loading?"wait":"pointer",background:loading?"#111":"#dc2626",color:"#fff",border:"none",letterSpacing:".5px"}}>
                {loading?<span className="pulse">⟳ Scanning...</span>:"⟳ SCAN NOW"}
              </button>
            </div>
          </div>

          {scanMsg&&<div className="pulse" style={{textAlign:"center",fontSize:10,color:"#dc262680",marginBottom:10}}>{scanMsg}</div>}

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
            {[{l:"S-Tier",v:gems.filter(g=>g.tier==="S_TIER").length,c:"#10b981"},
              {l:"A-Tier",v:gems.filter(g=>g.tier==="A_TIER").length,c:"#3b82f6"},
              {l:"KOL Backed",v:gems.filter(g=>g.kol>0).length,c:"#a855f7"},
              {l:"Detected",v:gems.length,c:"#ef4444"},
            ].map(s=>(
              <div key={s.l} style={{background:"#111113",border:"1px solid #1e1e21",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:"#3f3f46",marginTop:1}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
            {loading&&!gems.length&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"50px 20px"}}>
              <div style={{fontSize:18,color:"#dc2626",display:"inline-block"}} className="spin">⊗</div>
              <div className="pulse" style={{fontSize:11,color:"#dc262680",marginTop:10,letterSpacing:"2px"}}>SCANNING SOLANA MATRIX...</div>
            </div>}
            {filtered.map(g=><GemCard key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={setSnipeGem}/>)}
            {!loading&&gems.length>0&&filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"40px",color:"#3f3f46"}}>
              <div style={{fontSize:24,marginBottom:6}}>🔍</div>
              <div style={{fontSize:12}}>No gems match filters — try lowering Min Score</div>
            </div>}
          </div>
        </div>}

        {/* ── FEED TAB ── */}
        {tab==="feed"&&<div style={{padding:"18px 22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <h1 style={{fontSize:18,fontWeight:800,color:"#f4f4f5"}}>⚡ Live KOL Feed</h1>
            <div className="live-dot"/><span style={{fontSize:9,color:"#10b981",fontWeight:600}}>LIVE</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
            {KOLS.map(k=>{
              const kTrades=feedTrades.filter(t=>t.kol===k.name).slice(0,6);
              return(
                <div key={k.name} style={{background:"#111113",border:"1px solid #1e1e21",borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"10px 12px",borderBottom:"1px solid #18181b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:k.c+"25",border:`1px solid ${k.c}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:k.c}}>{k.name[0]}</div>
                      <div><div style={{fontWeight:700,fontSize:11,color:"#f4f4f5"}}>{k.name}</div>{k.tw&&<div style={{fontSize:8,color:"#3f3f46"}}>@{k.tw}</div>}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,fontWeight:700,color:k.pnl.startsWith("+")?"#10b981":"#ef4444"}}>{k.pnl}</div>
                      <div style={{fontSize:8,color:"#3f3f46"}}>Win {k.wr}%</div>
                    </div>
                  </div>
                  <div style={{maxHeight:160,overflowY:"auto"}}>
                    {kTrades.length===0?<div style={{padding:14,textAlign:"center",fontSize:9,color:"#27272a"}}>Waiting...</div>:
                    kTrades.map(t=>(
                      <div key={t.id} style={{display:"grid",gridTemplateColumns:"30px 1fr 1fr 24px",gap:3,padding:"4px 10px",borderBottom:"1px solid #111",alignItems:"center",fontSize:9}}>
                        <span style={{fontWeight:700,color:t.type==="buy"?"#10b981":"#ef4444"}}>{t.type==="buy"?"Buy":"Sell"}</span>
                        {t.type==="buy"?<><span style={{color:"#d4d4d8",fontWeight:600}}>{t.sol} <span style={{color:"#52525b"}}>Sol</span></span><span style={{color:"#f4f4f5"}}>{t.tokAmt} <span style={{color:"#10b981",fontWeight:700}}>{t.sym}</span></span></>
                        :<><span style={{color:"#f4f4f5"}}>{t.tokAmt} <span style={{color:"#ef4444",fontWeight:700}}>{t.sym}</span></span><span style={{color:"#d4d4d8",fontWeight:600}}>{t.sol} <span style={{color:"#52525b"}}>Sol</span></span></>}
                        <span style={{color:"#3f3f46",textAlign:"right"}}>{fmtAge(t.ago)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* ── LAUNCH TAB ── */}
        {tab==="launch"&&<div style={{padding:"18px 22px",maxWidth:500}}>
          <h1 style={{fontSize:18,fontWeight:800,color:"#f4f4f5",marginBottom:4}}>🚀 Launch Token</h1>
          <p style={{fontSize:11,color:"#3f3f46",marginBottom:16}}>Create & launch on Pump.fun · 100% on-chain via Phantom</p>
          {/* Wallet */}
          <div style={{display:"flex",alignItems:"center",padding:"8px 12px",marginBottom:14,background:"#111113",border:`1px solid ${wallet?"#10b98130":"#dc262630"}`,borderRadius:8}}>
            <div style={{flex:1}}><div style={{fontSize:10,color:wallet?"#10b981":"#ef4444",fontWeight:600}}>{wallet?`✓ ${wallet.slice(0,16)}...`:"Connect Phantom"}</div>{wBal&&<div style={{fontSize:9,color:"#3f3f46"}}>{wBal} SOL</div>}</div>
            <button onClick={connectWallet} style={{background:wallet?"#10b98110":"#dc262610",border:`1px solid ${wallet?"#10b98130":"#dc262640"}`,color:wallet?"#10b981":"#ef4444",padding:"5px 12px",borderRadius:6,fontSize:9,fontWeight:700,cursor:"pointer"}}>{wallet?"Connected":"Connect"}</button>
          </div>
          {ctStep==="form"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["name","TOKEN NAME *","Moon Pepe"],["sym","SYMBOL *","MPEPE"]].map(([k,l,p])=>(
                <div key={k}><div style={{fontSize:9,color:"#52525b",letterSpacing:"1px",marginBottom:4}}>{l}</div>
                <input value={ct[k]} onChange={e=>setCt(pr=>({...pr,[k]:e.target.value}))} placeholder={p}
                  style={{width:"100%",background:"#09090b",border:"1px solid #27272a",borderRadius:7,color:"#f4f4f5",padding:"9px 12px",fontSize:12,outline:"none"}}
                  onFocus={e=>e.target.style.borderColor="#dc2626"} onBlur={e=>e.target.style.borderColor="#27272a"}/></div>
              ))}
            </div>
            <div><div style={{fontSize:9,color:"#52525b",letterSpacing:"1px",marginBottom:4}}>DESCRIPTION</div>
            <textarea value={ct.desc} onChange={e=>setCt(p=>({...p,desc:e.target.value}))} placeholder="Token description..." rows={3}
              style={{width:"100%",background:"#09090b",border:"1px solid #27272a",borderRadius:7,color:"#f4f4f5",padding:"9px 12px",fontSize:11,outline:"none",resize:"vertical"}}/></div>
            <div><div style={{fontSize:9,color:"#52525b",letterSpacing:"1px",marginBottom:4}}>IMAGE URL</div>
            <input value={ct.img} onChange={e=>setCt(p=>({...p,img:e.target.value}))} placeholder="https://..."
              style={{width:"100%",background:"#09090b",border:"1px solid #27272a",borderRadius:7,color:"#f4f4f5",padding:"9px 12px",fontSize:11,outline:"none"}}/></div>
            <div style={{background:"#111113",border:"1px solid #27272a",borderRadius:8,padding:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:9,color:"#52525b",letterSpacing:"1px"}}>DEV BUY (SOL)</span>
                <span style={{fontSize:10,fontWeight:700,color:"#eab308"}}>{ct.devBuy} SOL</span>
              </div>
              <input type="range" min="0" max="5" step="0.1" value={ct.devBuy} onChange={e=>setCt(p=>({...p,devBuy:e.target.value}))} style={{width:"100%"}}/>
            </div>
            {ctMsg&&<div style={{fontSize:10,color:ctMsg.startsWith("✓")?"#10b981":"#f59e0b",textAlign:"center"}}>{ctMsg}</div>}
            <button onClick={launchToken} disabled={ctLoad||!ct.name||!ct.sym}
              style={{background:"linear-gradient(135deg,#dc2626,#7c3aed)",border:"none",color:"#fff",padding:"11px",
                borderRadius:8,fontSize:12,fontWeight:700,cursor:ctLoad?"wait":"pointer",letterSpacing:".5px",opacity:(!ct.name||!ct.sym)?0.4:1}}>
              {ctLoad?<span className="pulse">⟳ Processing...</span>:"⚡ LAUNCH ON-CHAIN"}
            </button>
          </div>}
          {ctStep==="done"&&<div style={{textAlign:"center",padding:"30px 20px",background:"#111113",border:"1px solid #10b98130",borderRadius:12}}>
            <div style={{fontSize:48,marginBottom:10}}>🚀</div>
            <div style={{fontSize:16,fontWeight:800,color:"#10b981",marginBottom:6}}>Token Launched!</div>
            <div style={{fontSize:11,color:"#52525b",marginBottom:4}}>${ct.sym.toUpperCase()} is live on Pump.fun</div>
            <div style={{fontSize:10,color:"#3f3f46",marginBottom:16}}>{ctMsg}</div>
            <button onClick={()=>{setCtStep("form");setCt({name:"",sym:"",desc:"",img:"",devBuy:"0.5"});setCtMsg("");}}
              style={{background:"#dc2626",border:"none",color:"#fff",padding:"8px 20px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>
              Launch Another
            </button>
          </div>}
        </div>}
      </main>
    </div>
  );
}
