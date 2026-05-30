"use client";

import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { GeassLogo } from "./GeassLogo";
import {
  IconSolana, IconCrown, IconSearch, IconZap, IconTarget,
  IconChart, IconShield, IconBroadcast, IconRocket, IconSpeaker, IconLock,
} from "./icons";

/* ════════════════════════════════════════════════════════════════
   GEASS — TERMINAL CINEMATIC  ·  pure-black command surface
   Mono data type · sharp edges · thin red command-lines · sigil eye
   ════════════════════════════════════════════════════════════════ */

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";

const GLOBAL_CSS = `
@keyframes g-scan    { 0%{top:0} 100%{top:100%} }
@keyframes g-blink   { 0%,49%{opacity:1} 50%,100%{opacity:0} }
@keyframes g-ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes g-ping    { 0%{transform:scale(1);opacity:.9} 75%,100%{transform:scale(2.6);opacity:0} }
@keyframes g-rise    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes g-iris    { 0%,100%{transform:scale(1);box-shadow:0 0 60px #ff2b4e22} 50%{transform:scale(1.04);box-shadow:0 0 110px #ff2b4e44} }
@keyframes g-sweep   { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }

.g-rise   { animation:g-rise .7s cubic-bezier(.16,1,.3,1) both }
.g-d1{animation-delay:.08s}.g-d2{animation-delay:.16s}.g-d3{animation-delay:.24s}.g-d4{animation-delay:.32s}
.g-ticker-track { display:flex; width:max-content; animation:g-ticker 42s linear infinite }
.g-ticker-track:hover { animation-play-state:paused }
.g-caret { animation:g-blink 1.1s step-end infinite }

/* terminal panel — sharp, bracketed, hover-lit */
.t-panel { position:relative; background:#070708; border:1px solid #18181c; transition:border-color .18s, background .18s }
.t-panel:hover { border-color:#2a2a30; background:#0a0a0c }
.t-panel::before,.t-panel::after{ content:""; position:absolute; width:9px; height:9px; pointer-events:none }
.t-panel::before{ top:-1px; left:-1px; border-top:1px solid #ff2b4e; border-left:1px solid #ff2b4e }
.t-panel::after { bottom:-1px; right:-1px; border-bottom:1px solid #ff2b4e; border-right:1px solid #ff2b4e }

.t-row { transition:background .15s }
.t-row:hover { background:#0d0d10 }
.navlink { color:#5a5a63; text-decoration:none; transition:color .15s; position:relative }
.navlink:hover { color:#f5f5f7 }
.btn-cmd { transition:background .15s, color .15s, border-color .15s, box-shadow .2s }
.btn-cmd:hover { box-shadow:0 0 0 1px #ff2b4e, 0 0 28px #ff2b4e35 }
.btn-ghost { transition:border-color .15s, color .15s, background .15s }
.btn-ghost:hover { border-color:#3a3a42 !important; color:#f5f5f7 !important; background:#0d0d10 !important }
.step-cell { transition:background .15s, border-color .15s }
.step-cell:hover { background:#0a0a0c; border-color:#2a2a30 !important }

details>summary{ list-style:none; cursor:pointer }
details>summary::-webkit-details-marker{ display:none }
.faq-x{ transition:transform .2s; display:inline-block }
details[open] .faq-x{ transform:rotate(45deg); color:#ff2b4e }
details[open]{ border-color:#2a2a30 !important; background:#0a0a0c !important }
.faq-i{ transition:border-color .15s } .faq-i:hover{ border-color:#2a2a30 !important }

/* layout */
.g-hero  { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr); gap:clamp(28px,4vw,64px); align-items:center }
.g-bento { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:#18181c; border:1px solid #18181c }
.g-2col  { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#18181c; border:1px solid #18181c }
.g-4col  { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:#18181c; border:1px solid #18181c }
.g-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:#18181c; border:1px solid #18181c }
.g-tg    { display:grid; grid-template-columns:1fr auto; gap:24px; align-items:start }
.g-soc   { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:#18181c; border:1px solid #18181c }
.span-2  { grid-column:span 2 }
.nav-links{ display:flex; gap:30px; align-items:center }
.nav-burger{ display:none !important } .nav-mcta{ display:none !important }
.hero-scope{ display:flex; justify-content:center }

@media (max-width:1024px){
  .g-bento{ grid-template-columns:repeat(2,1fr) } .g-steps{ grid-template-columns:repeat(2,1fr) }
  .g-soc{ grid-template-columns:1fr }
}
@media (max-width:680px){
  .g-hero{ grid-template-columns:1fr } .g-bento{ grid-template-columns:1fr } .g-2col{ grid-template-columns:1fr }
  .g-4col{ grid-template-columns:1fr 1fr } .g-steps{ grid-template-columns:1fr } .g-tg{ grid-template-columns:1fr }
  .span-2{ grid-column:span 1 }
  .nav-links{ display:none !important } .nav-burger{ display:flex !important } .nav-mcta{ display:flex !important }
  .hero-scope{ display:none } .tg-mock{ display:none }
}
`;

/* ─── data ─────────────────────────────────────────────── */
const FEED = [
  { token:"PEPE2",  act:"SNIPE",  kol:"Murad",     pct:"+284%", tier:"S" },
  { token:"BONK3",  act:"BUY",    kol:"0xSun",     pct:"+91%",  tier:"A" },
  { token:"WIF2",   act:"LAUNCH", kol:"Ansem",     pct:"+512%", tier:"S" },
  { token:"MYRO",   act:"BUY",    kol:"KingKong",  pct:"+63%",  tier:"A" },
  { token:"POPCAT", act:"SNIPE",  kol:"Darkfarms", pct:"+178%", tier:"S" },
  { token:"BOME",   act:"BUY",    kol:"Murad",     pct:"+340%", tier:"S" },
  { token:"SLERF",  act:"SNIPE",  kol:"Hsaka",     pct:"+220%", tier:"S" },
  { token:"MEMU",   act:"BUY",    kol:"Ansem",     pct:"+77%",  tier:"A" },
];
const TC: Record<string, string> = { S:"#10b981", A:"#3b82f6", B:"#eab308", C:"#f59e0b" };
const RED = "#ff2b4e";

/* ─── primitives ───────────────────────────────────────── */
const Label = ({ children }: { children: string }) => (
  <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:18, fontFamily:MONO, fontSize:10, fontWeight:600, letterSpacing:"3px", color:RED }}>
    <span style={{ color:"#2a2a30" }}>[</span>
    <span style={{ width:5, height:5, background:RED, display:"inline-block" }} />
    {children}
    <span style={{ color:"#2a2a30" }}>]</span>
  </div>
);

const H2 = ({ children, sub }: { children: string; sub?: string }) => (
  <div style={{ textAlign:"center", marginBottom:56 }}>
    <h2 style={{ fontSize:"clamp(26px,4.4vw,48px)", fontWeight:800, letterSpacing:"-1.8px", lineHeight:1.02, margin:0, color:"#f5f5f7", textTransform:"uppercase" }}>{children}</h2>
    {sub && <p style={{ fontSize:13, color:"#5a5a63", maxWidth:540, margin:"16px auto 0", lineHeight:1.7 }}>{sub}</p>}
  </div>
);

/* GEASS sigil eye — the command motif */
const Sigil = ({ size = 120 }: { size?: number }) => (
  <div style={{ position:"relative", width:size, height:size }}>
    <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`1px solid ${RED}40`, animation:"g-iris 4s ease-in-out infinite" }} />
    <div style={{ position:"absolute", inset:size*0.13, borderRadius:"50%", border:`1px solid ${RED}25` }} />
    <div style={{ position:"absolute", inset:0, animation:"g-sweep 9s linear infinite" }}>
      <div style={{ position:"absolute", top:-1, left:"50%", width:1, height:"50%", background:`linear-gradient(${RED},transparent)` }} />
    </div>
    {/* bird sigil */}
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg width={size*0.46} height={size*0.46} viewBox="0 0 24 24" fill="none">
        <path d="M12 3 L12 14 M12 8 C8 8 5 10 4 14 M12 8 C16 8 19 10 20 14 M9 14 L9 19 M15 14 L15 19" stroke={RED} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="12" cy="6" r="1.6" fill={RED} />
      </svg>
    </div>
  </div>
);

/* ─── ticker ───────────────────────────────────────────── */
function Ticker() {
  const items = [...FEED, ...FEED, ...FEED, ...FEED];
  return (
    <div style={{ background:"#000", borderTop:"1px solid #18181c", borderBottom:"1px solid #18181c", padding:"7px 0", display:"flex", alignItems:"center", overflow:"hidden", fontFamily:MONO }}>
      <div style={{ flexShrink:0, padding:"0 18px", display:"flex", alignItems:"center", gap:8, borderRight:"1px solid #18181c" }}>
        <span style={{ position:"relative", display:"inline-block", width:7, height:7 }}>
          <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#10b981", animation:"g-ping 1.6s cubic-bezier(0,0,.2,1) infinite" }} />
          <span style={{ position:"relative", display:"block", width:7, height:7, borderRadius:"50%", background:"#10b981" }} />
        </span>
        <span style={{ fontSize:9, color:"#48484f", fontWeight:600, letterSpacing:"2.5px" }}>LIVE_FEED</span>
      </div>
      <div style={{ flex:1, overflow:"hidden", maskImage:"linear-gradient(90deg,transparent,black 50px,black calc(100% - 50px),transparent)" }}>
        <div className="g-ticker-track">
          {items.map((it, i) => (
            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:9, fontSize:10, padding:"0 22px", borderRight:"1px solid #141417" }}>
              <span style={{ fontWeight:700, fontSize:9, color:TC[it.tier] }}>[{it.tier}]</span>
              <span style={{ color:"#c8c8ce", fontWeight:600 }}>{it.token}</span>
              <span style={{ color:"#48484f" }}>{it.act}</span>
              <span style={{ color:"#34343a" }}>@{it.kol}</span>
              <span style={{ color:"#10b981", fontWeight:700 }}>{it.pct}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── scope (scanner mock) ─────────────────────────────── */
function ScannerPreview() {
  const rows = [
    { name:"PEPE2", mc:"$2.1M",  score:94, tier:"S", chg:"+284%", c:"#10b981" },
    { name:"WIF2",  mc:"$5.4M",  score:97, tier:"S", chg:"+512%", c:"#10b981" },
    { name:"BONK3", mc:"$840K",  score:81, tier:"A", chg:"+91%",  c:"#3b82f6" },
    { name:"MYRO",  mc:"$320K",  score:74, tier:"A", chg:"+63%",  c:"#3b82f6" },
    { name:"SLERF", mc:"$1.8M",  score:88, tier:"S", chg:"+220%", c:"#10b981" },
  ];
  return (
    <div className="t-panel" style={{ width:"100%", maxWidth:560, fontFamily:MONO, boxShadow:"0 40px 120px #000, 0 0 80px #ff2b4e0a", overflow:"hidden" }}>
      <div style={{ position:"absolute", left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${RED}70,transparent)`, animation:"g-scan 3.2s linear infinite", zIndex:3, pointerEvents:"none" }} />
      {/* title bar */}
      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 16px", borderBottom:"1px solid #18181c", background:"#000" }}>
        <span style={{ color:RED, fontSize:11 }}>◉</span>
        <span style={{ fontSize:10, color:"#5a5a63", letterSpacing:"1.5px", fontWeight:600 }}>geass://alpha_scanner</span>
        <span style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:9, color:"#10b981", fontWeight:600 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981" }} /> STREAMING
        </span>
      </div>
      {/* headers */}
      <div style={{ display:"grid", gridTemplateColumns:"32px 1fr 58px 44px 60px", gap:0, padding:"6px 16px", borderBottom:"1px solid #141417", background:"#050506" }}>
        {["","TOKEN","MCAP","CHG","SCORE"].map(h => (
          <span key={h} style={{ fontSize:8, color:"#34343a", fontWeight:600, letterSpacing:"1px" }}>{h}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="t-row" style={{ display:"grid", gridTemplateColumns:"32px 1fr 58px 44px 60px", gap:0, padding:"10px 16px", borderBottom: i < rows.length - 1 ? "1px solid #0e0e10" : "none" }}>
          <span style={{ fontSize:9, fontWeight:700, color:r.c, alignSelf:"center" }}>[{r.tier}]</span>
          <span style={{ fontSize:12, fontWeight:600, color:"#f5f5f7", alignSelf:"center" }}>{r.name}</span>
          <span style={{ fontSize:10, color:"#5a5a63", alignSelf:"center" }}>{r.mc}</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#10b981", alignSelf:"center" }}>{r.chg}</span>
          <div style={{ display:"flex", alignItems:"center", gap:5, alignSelf:"center" }}>
            <div style={{ flex:1, height:3, background:"#141417", overflow:"hidden" }}>
              <div style={{ width:`${r.score}%`, height:"100%", background:r.c }} />
            </div>
            <span style={{ fontSize:9, color:r.c, fontWeight:700, minWidth:18 }}>{r.score}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── login modal (logic preserved) ───────────────────── */
function LoginModal({ onClose, onConnect, connecting, initError }: {
  onClose: () => void;
  onConnect: () => Promise<void>;
  connecting: boolean;
  initError: string;
}) {
  const [tgStep, setTgStep] = useState<"idle"|"waiting"|"done">("idle");
  const [tgCode, setTgCode] = useState("");
  const [tgErr,  setTgErr]  = useState("");
  const [phErr,  setPhErr]  = useState(initError);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => { setPhErr(initError); }, [initError]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const doPhantom = async () => {
    setPhErr("");
    try { await onConnect(); onClose(); }
    catch (e) { setPhErr(e instanceof Error ? e.message : "Connection failed"); }
  };

  const doTelegram = async () => {
    setTgErr("");
    try {
      const r = await fetch("/api/auth/telegram/init", { method:"POST" });
      if (!r.ok) { setTgErr("Could not generate code. Try again."); return; }
      const { code } = await r.json() as { code:string };
      setTgCode(code); setTgStep("waiting");
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/auth/telegram/poll?code=${code}`);
          const d  = await pr.json() as { verified:boolean; wallet?:string; error?:string };
          if (d.verified)              { clearInterval(pollRef.current!); setTgStep("done"); try { if (d.wallet) localStorage.setItem("geass_wallet", d.wallet); } catch {/* noop */} setTimeout(() => window.location.reload(), 800); }
          if (d.error==="Code expired"){ clearInterval(pollRef.current!); setTgStep("idle"); setTgErr("Code expired — try again."); }
        } catch {/* keep polling */}
      }, 2000);
      setTimeout(() => { if (pollRef.current) { clearInterval(pollRef.current); setTgStep("idle"); setTgErr("Timed out — try again."); }}, 300_000);
    } catch { setTgErr("Connection error."); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#000000d8", zIndex:200, backdropFilter:"blur(6px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:201, width:"min(440px,94vw)", background:"#070708", border:`1px solid #2a2a30`, boxShadow:"0 48px 120px #000, 0 0 60px #ff2b4e10", fontFamily:MONO }}>
        <div style={{ height:2, background:RED }} />
        <div style={{ padding:"26px 28px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:11 }}>
              <GeassLogo size={24} />
              <div>
                <div style={{ fontWeight:800, fontSize:14, letterSpacing:"3px", color:"#f5f5f7" }}>GEASS</div>
                <div style={{ fontSize:8, color:"#48484f", letterSpacing:"2px" }}>AUTH_REQUIRED</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"#0c0c0e", border:"1px solid #222226", color:"#5a5a63", cursor:"pointer", fontSize:16, lineHeight:1, padding:"6px 10px" }}>×</button>
          </div>

          {tgStep==="idle" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:11, color:"#48484f", marginBottom:4, letterSpacing:"1px" }}>{"> select access method"}</div>
              <button onClick={doPhantom} disabled={connecting} className="btn-cmd" style={{ width:"100%", padding:"14px 18px", border:`1px solid ${RED}`, background:RED, color:"#fff", fontSize:13, fontWeight:700, cursor:connecting ? "wait" : "pointer", display:"flex", alignItems:"center", gap:11, fontFamily:MONO, letterSpacing:".5px" }}>
                <IconSolana size={17} />
                {connecting ? "CONNECTING…" : "CONNECT PHANTOM"}
                <span style={{ marginLeft:"auto", fontSize:9, opacity:.65, fontWeight:500 }}>solana</span>
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"3px 0" }}>
                <div style={{ flex:1, height:1, background:"#18181c" }} />
                <span style={{ fontSize:9, color:"#34343a", letterSpacing:"1px" }}>OR</span>
                <div style={{ flex:1, height:1, background:"#18181c" }} />
              </div>
              <button onClick={doTelegram} className="btn-ghost" style={{ width:"100%", padding:"13px 18px", border:"1px solid #1a3550", background:"#070b12", color:"#38bdf8", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:11, fontFamily:MONO }}>
                <span style={{ fontSize:16 }}>✈</span> LOGIN_TELEGRAM
                <span style={{ marginLeft:"auto", fontSize:9, opacity:.6 }}>@geasstrade_bot</span>
              </button>
              <a href="/api/auth/twitter" className="btn-ghost" style={{ width:"100%", padding:"13px 18px", border:"1px solid #18181c", background:"#0a0a0c", color:"#9a9aa2", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:11, textDecoration:"none", boxSizing:"border-box", fontFamily:MONO }}>
                <span style={{ fontSize:14, fontWeight:900 }}>𝕏</span> LOGIN_X
                <span style={{ marginLeft:"auto", fontSize:9, opacity:.5 }}>twitter</span>
              </a>
              {phErr && <div style={{ fontSize:11, color:RED, padding:"9px 12px", background:`${RED}10`, border:`1px solid ${RED}30`, marginTop:4 }}>{phErr}</div>}
              {tgErr && <div style={{ fontSize:11, color:RED, marginTop:4 }}>{tgErr}</div>}
              <p style={{ fontSize:9, color:"#34343a", textAlign:"center", marginTop:6, letterSpacing:".5px" }}>NON-CUSTODIAL · NO REGISTRATION · FREE</p>
            </div>
          )}

          {tgStep==="waiting" && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#9a9aa2", marginBottom:16 }}>
                Open <span style={{ color:"#38bdf8", fontWeight:700 }}>@geasstrade_bot</span> and send:
              </div>
              <div style={{ fontSize:34, fontWeight:700, letterSpacing:10, color:"#f5f5f7", background:"#070b12", border:"1px solid #1a3550", padding:"16px 0", marginBottom:16 }}>{tgCode}</div>
              <a href={`https://t.me/geasstrade_bot?start=${tgCode}`} target="_blank" rel="noopener noreferrer" style={{ display:"inline-block", background:"#0088cc", color:"#fff", fontWeight:700, fontSize:12, padding:"11px 22px", marginBottom:14, textDecoration:"none", fontFamily:MONO }}>
                OPEN IN TELEGRAM →
              </a>
              <p style={{ fontSize:10, color:"#5a5a63", marginBottom:16 }}>auto-verified once received…</p>
              <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setTgStep("idle"); setTgCode(""); }} style={{ fontSize:10, color:"#5a5a63", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>cancel</button>
              <p style={{ fontSize:9, color:"#34343a", marginTop:12 }}>Bot silent? <a href="/api/auth/telegram/debug" target="_blank" rel="noopener noreferrer" style={{ color:"#38bdf8", textDecoration:"none" }}>run diagnostics</a></p>
            </div>
          )}

          {tgStep==="done" && (
            <div style={{ textAlign:"center", padding:"26px 0" }}>
              <div style={{ width:54, height:54, background:"#10b98112", border:"1px solid #10b98140", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:24, color:"#10b981" }}>✓</div>
              <div style={{ fontSize:14, color:"#10b981", fontWeight:700, letterSpacing:"1px" }}>AUTHENTICATED — LOADING…</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── feature cell ─────────────────────────────────────── */
function BCard({ icon, color, title, desc, badge, span2 }: {
  icon: React.ReactNode; color: string; title: string; desc: string; badge?: string; span2?: boolean;
}) {
  return (
    <div className={`t-row${span2 ? " span-2" : ""}`} style={{ background:"#050506", padding:"24px 22px", position:"relative" }}>
      <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:13 }}>
        <div style={{ width:34, height:34, background:`${color}10`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:"#f5f5f7", letterSpacing:".3px" }}>{title}</span>
        {badge && <span style={{ fontSize:8, fontWeight:600, color, border:`1px solid ${color}35`, padding:"2px 7px", letterSpacing:"1px", fontFamily:MONO }}>{badge}</span>}
      </div>
      <p style={{ fontSize:12, color:"#5a5a63", lineHeight:1.75, margin:0 }}>{desc}</p>
    </div>
  );
}

/* ─── spotlight ────────────────────────────────────────── */
function Spot({ color, icon, badge, title, desc, bullets }: {
  color: string; icon: React.ReactNode; badge: string; title: string; desc: string; bullets: string[];
}) {
  return (
    <div className="t-row" style={{ background:"#050506", padding:"34px 30px", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:0, width:2, height:"100%", background:color }} />
      <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:18 }}>
        <div style={{ width:46, height:46, background:`${color}10`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color, letterSpacing:"2.5px", marginBottom:4, fontFamily:MONO }}>{badge}</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#f5f5f7" }}>{title}</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:"#5a5a63", lineHeight:1.8, marginBottom:22 }}>{desc}</p>
      <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10, margin:0, padding:0 }}>
        {bullets.map(b => (
          <li key={b} style={{ display:"flex", gap:10, fontSize:12, color:"#7a7a82", alignItems:"flex-start", fontFamily:MONO }}>
            <span style={{ color, fontWeight:700, flexShrink:0 }}>▸</span>{b}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── testimonial ──────────────────────────────────────── */
function TestimonialCard({ quote, handle, tier, gain, color }: {
  quote: string; handle: string; tier: string; gain: string; color: string;
}) {
  return (
    <div className="t-row" style={{ background:"#050506", padding:"24px 22px", position:"relative" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:13 }}>
        <div style={{ display:"flex", gap:2 }}>
          {[1,2,3,4,5].map(s => <span key={s} style={{ color:"#f59e0b", fontSize:10 }}>★</span>)}
        </div>
        <span style={{ fontSize:10, fontWeight:700, color, border:`1px solid ${color}30`, padding:"2px 8px", fontFamily:MONO }}>{gain}</span>
      </div>
      <p style={{ fontSize:12, color:"#9a9aa2", lineHeight:1.75, marginBottom:16 }}>&ldquo;{quote}&rdquo;</p>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:30, height:30, background:`${color}14`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color, fontFamily:MONO }}>
          {handle[1].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#f5f5f7", fontFamily:MONO }}>{handle}</div>
          <div style={{ fontSize:9, color:"#48484f" }}>tier_{tier} user</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
interface Props { onConnect: () => Promise<void>; connecting: boolean; }

export function LandingPage({ onConnect, connecting }: Props) {
  const [showLogin, setShowLogin] = useState(false);
  const [loginErr,  setLoginErr]  = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const e = p.get("login_error");
    if (e) { setLoginErr(decodeURIComponent(e)); setShowLogin(true); window.history.replaceState({}, "", window.location.pathname); }
  }, []);

  const open = () => { setLoginErr(""); setShowLogin(true); setMobileNav(false); };

  return (
    <div style={{ background:"#000", color:"#f5f5f7", fontFamily:"'Inter',system-ui,sans-serif", minHeight:"100vh", overflowX:"hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onConnect={onConnect} connecting={connecting} initError={loginErr} />}

      {/* ─── NAV ─── */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"#000000ee", backdropFilter:"blur(20px)", borderBottom:"1px solid #18181c" }}>
        <div style={{ display:"flex", alignItems:"center", padding:"0 clamp(16px,4vw,56px)", height:58, gap:12, maxWidth:1440, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
            <GeassLogo size={26} />
            <span style={{ fontWeight:800, fontSize:14, letterSpacing:"3px", whiteSpace:"nowrap", color:"#f5f5f7" }}>GEASS</span>
            <span style={{ fontSize:8, color:"#34343a", letterSpacing:"3px", whiteSpace:"nowrap", fontFamily:MONO }}>ALPHA_RECON</span>
          </div>

          <div className="nav-links">
            {(["#features","#security","#pricing"] as const).map((h, i) => (
              <a key={h} href={h} className="navlink" style={{ fontSize:12, letterSpacing:".5px", whiteSpace:"nowrap", fontWeight:500, fontFamily:MONO }}>
                {["features","security","pricing"][i]}
              </a>
            ))}
            <button onClick={open} className="btn-cmd" style={{ padding:"8px 22px", border:`1px solid ${RED}`, background:"transparent", color:RED, fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"1px", whiteSpace:"nowrap", fontFamily:MONO }}>
              ENTER ▸
            </button>
          </div>

          <button onClick={open} className="nav-mcta btn-cmd" style={{ padding:"8px 14px", border:`1px solid ${RED}`, background:"transparent", color:RED, fontSize:11, fontWeight:700, cursor:"pointer", alignItems:"center", justifyContent:"center", fontFamily:MONO }}>
            ENTER ▸
          </button>
          <button onClick={() => setMobileNav(v => !v)} className="nav-burger" aria-label="Menu" style={{ padding:"8px 10px", border:"1px solid #222226", background:"transparent", color:"#5a5a63", cursor:"pointer", fontSize:16, lineHeight:1, alignItems:"center", justifyContent:"center" }}>
            {mobileNav ? "×" : "≡"}
          </button>
        </div>

        {mobileNav && (
          <div style={{ borderTop:"1px solid #18181c", background:"#000", padding:"10px clamp(16px,4vw,56px) 16px" }}>
            {(["#features","#security","#pricing"] as const).map((h, i) => (
              <a key={h} href={h} onClick={() => setMobileNav(false)} style={{ display:"block", padding:"13px 0", fontSize:14, color:"#9a9aa2", textDecoration:"none", borderBottom:"1px solid #0e0e10", fontFamily:MONO }}>
                {["features","security","pricing"][i]}
              </a>
            ))}
          </div>
        )}
      </nav>

      <Ticker />

      {/* ─── HERO ─── */}
      <section style={{ position:"relative", padding:"clamp(56px,8vw,118px) clamp(16px,5vw,64px) clamp(44px,6vw,90px)", overflow:"hidden" }}>
        {/* faint grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(#ffffff05 1px,transparent 1px),linear-gradient(90deg,#ffffff05 1px,transparent 1px)", backgroundSize:"56px 56px", maskImage:"radial-gradient(ellipse 80% 70% at 50% 30%,black,transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:600, height:600, background:`radial-gradient(circle,${RED}0c 0%,transparent 60%)`, filter:"blur(70px)", pointerEvents:"none" }} />

        <div className="g-hero" style={{ maxWidth:1400, margin:"0 auto", position:"relative" }}>
          <div className="g-rise">
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, border:"1px solid #18181c", padding:"6px 14px", fontSize:9, color:"#10b981", fontWeight:600, marginBottom:30, letterSpacing:"2px", fontFamily:MONO }}>
              <span style={{ position:"relative", display:"inline-flex", width:7, height:7 }}>
                <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#10b981", animation:"g-ping 1.8s cubic-bezier(0,0,.2,1) infinite" }} />
                <span style={{ position:"relative", display:"block", width:7, height:7, borderRadius:"50%", background:"#10b981" }} />
              </span>
              SOLANA_MAINNET · 48ms · ONLINE
            </div>

            <h1 style={{ fontSize:"clamp(40px,6vw,80px)", fontWeight:800, lineHeight:0.96, marginBottom:22, letterSpacing:"-3px", textTransform:"uppercase" }}>
              See the alpha<br />
              <span style={{ color:RED }}>first.</span>
              <span className="g-caret" style={{ color:RED, fontWeight:300 }}>_</span>
            </h1>

            <p style={{ fontSize:"clamp(14px,1.5vw,16px)", color:"#5a5a63", maxWidth:440, lineHeight:1.75, marginBottom:36, fontFamily:MONO }}>
              Helius WebSocket detection · on-chain safety scoring · KOL tracking · Jito-protected execution. Solana alpha, before it hits Twitter.
            </p>

            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:38 }}>
              <button onClick={open} className="btn-cmd" style={{ padding:"15px clamp(26px,4vw,40px)", border:`1px solid ${RED}`, background:RED, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:"1px", fontFamily:MONO }}>
                ENTER GEASS ▸
              </button>
              <a href="#features" className="btn-ghost" style={{ padding:"15px 24px", border:"1px solid #18181c", background:"transparent", color:"#9a9aa2", fontSize:13, fontWeight:600, textDecoration:"none", display:"inline-flex", alignItems:"center", fontFamily:MONO }}>
                ./features ↓
              </a>
            </div>

            <div style={{ display:"inline-flex", gap:0, flexWrap:"wrap", border:"1px solid #18181c", fontFamily:MONO }}>
              {[{ v:"48ms", l:"DETECT", c:RED },{ v:"3.2k+", l:"TOKENS/D", c:"#8b5cf6" },{ v:"94%", l:"ACCURACY", c:"#10b981" }].map((s, i) => (
                <div key={s.l} style={{ textAlign:"center", padding:"16px 24px", borderRight: i < 2 ? "1px solid #18181c" : "none" }}>
                  <div style={{ fontSize:"clamp(18px,2.6vw,24px)", fontWeight:700, letterSpacing:"-1px", color:s.c, marginBottom:3 }}>{s.v}</div>
                  <div style={{ fontSize:8, color:"#48484f", letterSpacing:"1.5px" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* scope */}
          <div className="hero-scope">
            <ScannerPreview />
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section style={{ padding:"0 clamp(16px,5vw,64px) clamp(24px,4vw,48px)" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div className="g-4col">
            {[
              { v:"48ms",  l:"detection latency",     s:"p99 ws push",         c:RED },
              { v:"3.2k+", l:"tokens detected / day", s:"solana mainnet",      c:"#8b5cf6" },
              { v:"94%",   l:"signal accuracy",        s:"s-tier 30d",         c:"#10b981" },
              { v:"12×",   l:"avg return on s-tier",   s:"30d trailing",       c:"#3b82f6" },
            ].map((s) => (
              <div key={s.l} className="step-cell" style={{ background:"#050506", padding:"clamp(22px,3.4vw,38px) clamp(14px,2.4vw,28px)", textAlign:"center", cursor:"default", fontFamily:MONO }}>
                <div style={{ fontSize:"clamp(26px,4vw,48px)", fontWeight:700, letterSpacing:"-2px", color:s.c, marginBottom:8 }}>{s.v}</div>
                <div style={{ fontSize:11, color:"#9a9aa2", fontWeight:600, marginBottom:4, letterSpacing:".5px" }}>{s.l}</div>
                <div style={{ fontSize:9, color:"#34343a", letterSpacing:".5px" }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURE BENTO ─── */}
      <section id="features" style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <Label>ALL_FEATURES</Label>
            <H2 sub="Eight intelligence layers — from first mint to final exit. Detection, safety, automation, and execution in one terminal.">
              Everything you need to win
            </H2>
          </div>

          <div className="g-bento">
            {/* Alpha Scanner — span 2 */}
            <div className="span-2 t-row" style={{ background:"#050506", padding:"26px 24px 20px", position:"relative" }}>
              <div style={{ position:"absolute", top:0, left:0, width:2, height:"100%", background:"#10b981" }} />
              <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:15 }}>
                <div style={{ width:36, height:36, background:"#10b98110", border:"1px solid #10b98130", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#10b981" }}><IconSearch size={18}/></span>
                </div>
                <span style={{ fontSize:15, fontWeight:700, color:"#f5f5f7" }}>Alpha Scanner</span>
                <span style={{ fontSize:8, fontWeight:600, color:"#10b981", border:"1px solid #10b98135", padding:"2px 7px", letterSpacing:"1px", fontFamily:MONO }}>LIVE</span>
              </div>
              <p style={{ fontSize:12, color:"#5a5a63", lineHeight:1.75, marginBottom:18, maxWidth:420 }}>
                Real-time detection of every new Solana token within 48ms of mint, scored by 20+ on-chain signals before most platforms even index the transaction.
              </p>
              <div style={{ border:"1px solid #18181c", fontFamily:MONO }}>
                {[
                  { name:"PEPE2",mc:"$2.1M",score:94,tier:"S",chg:"+284%",c:"#10b981"},
                  { name:"WIF2", mc:"$5.4M",score:97,tier:"S",chg:"+512%",c:"#10b981"},
                  { name:"BONK3",mc:"$840K",score:81,tier:"A",chg:"+91%", c:"#3b82f6"},
                ].map((r, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderBottom: i < 2 ? "1px solid #0e0e10" : "none", flexWrap:"wrap" }}>
                    <span style={{ fontSize:9, fontWeight:700, color:r.c, flexShrink:0 }}>[{r.tier}]</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"#f5f5f7", flex:1, minWidth:60 }}>{r.name}</span>
                    <span style={{ fontSize:10, color:"#5a5a63", flexShrink:0 }}>{r.mc}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#10b981", flexShrink:0 }}>{r.chg}</span>
                    <div style={{ width:52, height:3, background:"#141417", overflow:"hidden", flexShrink:0 }}>
                      <div style={{ width:`${r.score}%`, height:"100%", background:r.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <BCard icon={<IconBroadcast size={18}/>} color="#3b82f6" title="Live KOL Feed" desc="Watch 50+ high-alpha wallets in real-time — their buys, sells, and launches the moment they hit the chain." />
            <BCard icon={<IconRocket size={18}/>} color="#8b5cf6" title="Token Launch" desc="Deploy on Pump.fun in under 60 seconds. IPFS metadata, bonding curve config — all on-chain via Phantom." />

            {/* Telegram — span 2 */}
            <div className="span-2 t-row" style={{ background:"#050506", padding:"26px 24px", position:"relative" }}>
              <div style={{ position:"absolute", top:0, left:0, width:2, height:"100%", background:"#38bdf8" }} />
              <div className="g-tg">
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:13 }}>
                    <div style={{ width:36, height:36, background:"#38bdf810", border:"1px solid #38bdf830", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ color:"#38bdf8", fontSize:18 }}>✈</span>
                    </div>
                    <span style={{ fontSize:15, fontWeight:700, color:"#f5f5f7" }}>Telegram Alerts</span>
                    <span style={{ fontSize:8, fontWeight:600, color:"#38bdf8", border:"1px solid #38bdf835", padding:"2px 7px", letterSpacing:"1px", fontFamily:MONO }}>NEW</span>
                  </div>
                  <p style={{ fontSize:12, color:"#5a5a63", lineHeight:1.75, marginBottom:15, maxWidth:360 }}>
                    Connect @geasstrade_bot for instant TP/SL hits, snipe confirmations, and whale alerts — straight to your phone.
                  </p>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {["/status","/alerts","/pnl","/disconnect"].map(c => (
                      <span key={c} style={{ fontSize:10, color:"#38bdf8", border:"1px solid #38bdf825", padding:"4px 9px", fontFamily:MONO, fontWeight:600 }}>{c}</span>
                    ))}
                  </div>
                </div>
                <div className="tg-mock" style={{ background:"#050a12", border:"1px solid #1a3550", padding:"14px 16px", minWidth:200, flexShrink:0, fontFamily:MONO }}>
                  <div style={{ fontSize:9, color:"#38bdf8", fontWeight:600, marginBottom:11, letterSpacing:"1px" }}>@geasstrade_bot</div>
                  {[
                    { msg:"TP hit: WIF2 +120%",   c:"#10b981" },
                    { msg:"Snipe ok: PEPE2",       c:"#38bdf8" },
                    { msg:"Whale buy: $340K BOME", c:"#8b5cf6" },
                  ].map((m, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom: i < 2 ? "1px solid #122838" : "none" }}>
                      <span style={{ color:m.c }}>▸</span>
                      <span style={{ fontSize:11, color:m.c, flex:1, fontWeight:500 }}>{m.msg}</span>
                      <span style={{ fontSize:8, color:"#1e3a50" }}>now</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <BCard icon={<IconSearch size={18}/>} color="#f59e0b" title="Bundle Detector"   desc="Groups early-block buys by wallet cluster. Flags coordinated launches with a risk score before you open a position." badge="NEW" />
            <BCard icon={<IconTarget size={18}/>} color={RED}       title="TP / SL Alerts"   desc="Set take-profit and stop-loss % on any trade. GEASS watches price on-chain and fires a Telegram alert on hit." badge="NEW" />
            <BCard icon={<IconChart size={18}/>}  color="#10b981" title="PnL Tracker"      desc="Track realized gains across all GEASS trades. Token-by-token breakdown and cumulative SOL P&L." badge="NEW" />
            <BCard icon={<IconLock size={18}/>}   color="#8b5cf6" title="LP Lock Verifier" desc="Checks burn address, Fluxbeam, and Streamflow in parallel. Shows locked% and burn% at a glance." badge="NEW" />
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section id="security" style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <Label>SAFETY_TOOLS</Label>
            <H2 sub="GEASS runs security checks automatically on every token — so you know before you ape.">
              Know before you trade
            </H2>
          </div>
          <div className="g-2col">
            <Spot color="#f59e0b" icon={<IconSearch size={22}/>} badge="BUNDLE_DETECTOR"
              title="Spot coordinated launches"
              desc="Groups early-block transactions by wallet cluster. If 3+ wallets bought in the same slot with the same deployer signature — it's flagged before you see the token card."
              bullets={["Groups buys by slot + deployer","Flags early holder overlap","Shows bundle count + risk level","In every token detail card"]}
            />
            <Spot color="#8b5cf6" icon={<IconLock size={22}/>} badge="LP_LOCK_VERIFIER"
              title="Liquidity safety, every token"
              desc="Checks three sources in parallel: burn address holdings, Fluxbeam lock contracts, and Streamflow vesting. Displays locked% and burn% on the panel automatically."
              bullets={["burn + Fluxbeam + Streamflow","Real-time locked% / burn%","Burned vs time-locked LP","Auto-runs on panel open"]}
            />
          </div>
        </div>
      </section>

      {/* ─── AUTOMATION ─── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <Label>AUTOMATION</Label>
            <H2 sub="Set your rules once. GEASS monitors the chain 24/7 and notifies you the moment it matters.">
              Trade smarter, not harder
            </H2>
          </div>
          <div className="g-2col">
            <Spot color={RED} icon={<IconTarget size={22}/>} badge="TP_SL_ALERTS"
              title="Never miss your exit"
              desc="After any snipe, set a take-profit % and stop-loss %. GEASS watches the bonding curve price and fires an instant Telegram notification when either is crossed."
              bullets={["Configure TP% / SL% per position","Monitors price on-chain","Fires Telegram notification","Manage rules from Settings"]}
            />
            <Spot color="#10b981" icon={<IconChart size={22}/>} badge="PNL_TRACKER"
              title="Know your real performance"
              desc="Every trade is recorded — entry, size, outcome. View per-token realized P&L and cumulative SOL gain/loss in the Trades tab, synced across devices."
              bullets={["Records every buy + sell","Realized SOL P&L per trade","Cumulative + per-token filters","Redis-backed, synced"]}
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <Label>EXECUTION_PIPELINE</Label>
            <H2 sub="Four intelligence layers fire in under 200ms — from on-chain event to your decision point.">
              From mint to position
            </H2>
          </div>
          <div className="g-steps">
            {[
              { n:"01", title:"DETECT",  color:RED,       desc:"Helius WebSocket pushes new mints in ~48ms — first to know, first to act." },
              { n:"02", title:"ENRICH",  color:"#f59e0b", desc:"Bonding curve, holders, mint authority, LP lock — scored in parallel." },
              { n:"03", title:"SCORE",   color:"#3b82f6", desc:"20+ signals produce an S/A/B/C/Rug tier badge under 100ms." },
              { n:"04", title:"EXECUTE", color:"#10b981", desc:"One-click buy or auto-snipe via Jito MEV-protected bundle." },
            ].map((s) => (
              <div key={s.n} className="step-cell" style={{ background:"#050506", padding:"30px 24px", textAlign:"left", position:"relative", fontFamily:MONO }}>
                <div style={{ fontSize:40, fontWeight:800, color:s.color, lineHeight:1, marginBottom:16, letterSpacing:"-2px" }}>{s.n}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#f5f5f7", marginBottom:10, letterSpacing:"1px" }}>{s.title}</div>
                <div style={{ fontSize:11, color:"#5a5a63", lineHeight:1.7 }}>{s.desc}</div>
                <div style={{ position:"absolute", top:0, left:0, width:24, height:2, background:s.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <Label>FIELD_REPORTS</Label>
            <H2 sub="Traders across Solana are already using GEASS to get the edge.">
              What the community says
            </H2>
          </div>
          <div className="g-soc">
            <TestimonialCard quote="Caught WIF2 at $180K MC — sold at $2.4M. The S-tier badge and KOL overlap was the signal. Nothing comes close to this latency." handle="@degensol_" tier="S" gain="+1,233%" color="#10b981" />
            <TestimonialCard quote="The bundle detector saved me twice in one week. Both tokens rugged within hours. Those red flags are not noise — they're real." handle="@on_chain_kai" tier="A" gain="2 rugs avoided" color={RED} />
            <TestimonialCard quote="TP alerts on Telegram are a game-changer. Set it and forget it. Got pinged at +120% on SLERF automatically." handle="@sol_flywheel" tier="S" gain="+120% auto" color="#8b5cf6" />
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <Label>ACCESS_TIERS</Label>
            <H2 sub="Start free — no card, no KYC. Upgrade on-chain via Phantom in seconds.">
              Simple. On-chain. Transparent.
            </H2>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1px", background:"#18181c", border:"1px solid #18181c" }}>

            {/* ── SCOUT ── */}
            <div style={{ background:"#050506", padding:"34px 28px", fontFamily:MONO, display:"flex", flexDirection:"column" }}>
              <div style={{ fontSize:9, fontWeight:600, color:"#48484f", letterSpacing:"2.5px", marginBottom:20 }}>FREE_FOREVER</div>
              <div style={{ marginBottom:6 }}>
                <span style={{ fontSize:48, fontWeight:800, letterSpacing:"-3px", color:"#f5f5f7" }}>Scout</span>
              </div>
              <div style={{ marginBottom:22 }}>
                <span style={{ fontSize:28, fontWeight:700, color:"#f5f5f7" }}>0</span>
                <span style={{ fontSize:14, color:"#5a5a63" }}> SOL / mo</span>
                <div style={{ fontSize:9, color:"#34343a", marginTop:4 }}>no card · no signup · no expiry</div>
              </div>
              <div style={{ height:1, background:"#18181c", marginBottom:20 }} />
              <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:9, flex:1 }}>
                {["Home & trending tokens","KOL Feed (limited, view only)","Community","Watchlist (max 5 tokens)","Token Launch on Pump.fun","Marketplace (browse, buy & sell)","Basic profile","Telegram + X login"].map(f => (
                  <li key={f} style={{ display:"flex", gap:9, fontSize:11, color:"#7a7a82", alignItems:"flex-start" }}>
                    <span style={{ color:"#10b981", flexShrink:0, fontWeight:700 }}>▸</span>{f}
                  </li>
                ))}
                {["Alpha Scanner","Auto-Snipe","Price Alerts","Portfolio Tracker"].map(f => (
                  <li key={f} style={{ display:"flex", gap:9, fontSize:11, color:"#34343a", alignItems:"flex-start" }}>
                    <span style={{ flexShrink:0 }}>✕</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={open} className="btn-ghost" style={{ width:"100%", padding:"12px", border:"1px solid #222226", background:"transparent", color:"#9a9aa2", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:MONO, letterSpacing:".5px", marginTop:24 }}>
                START FREE ▸
              </button>
            </div>

            {/* ── MILLIONER ── */}
            <div style={{ background:"#070708", padding:"34px 28px", fontFamily:MONO, display:"flex", flexDirection:"column", position:"relative", borderLeft:"1px solid #18181c", borderRight:"1px solid #18181c" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"#8b5cf6" }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <span style={{ fontSize:9, fontWeight:600, color:"#8b5cf6", letterSpacing:"2.5px" }}>MILLIONER</span>
                <span style={{ fontSize:8, fontWeight:600, color:"#8b5cf6", border:"1px solid #8b5cf635", padding:"2px 8px", letterSpacing:"1px" }}>POPULAR</span>
              </div>
              <div style={{ marginBottom:6 }}>
                <span style={{ fontSize:48, fontWeight:800, letterSpacing:"-3px", color:"#f5f5f7" }}>Millioner</span>
              </div>
              <div style={{ marginBottom:22 }}>
                <span style={{ fontSize:28, fontWeight:700, color:"#f5f5f7" }}>1</span>
                <span style={{ fontSize:14, color:"#5a5a63" }}> SOL / mo</span>
                <div style={{ fontSize:9, color:"#34343a", marginTop:4 }}>on-chain via Phantom · 30 days</div>
              </div>
              <div style={{ height:1, background:"#18181c", marginBottom:20 }} />
              <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:9, flex:1 }}>
                {["Everything in Scout","Alpha Scanner (unlimited)","KOL Feed (full)","Intel & Social Tracker","Predictions","Watchlist (unlimited)","Auto-Snipe (max 0.5 SOL/snipe)","Price Alerts","Portfolio Tracker","Wallet Tracker","Trade History Export","Token Deep Scan","Referral program"].map(f => (
                  <li key={f} style={{ display:"flex", gap:9, fontSize:11, color:"#9a9aa2", alignItems:"flex-start" }}>
                    <span style={{ color:"#8b5cf6", flexShrink:0, fontWeight:700 }}>▸</span>{f}
                  </li>
                ))}
                {["AI Trading","Copy Trading","API Access"].map(f => (
                  <li key={f} style={{ display:"flex", gap:9, fontSize:11, color:"#34343a", alignItems:"flex-start" }}>
                    <span style={{ flexShrink:0 }}>✕</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={open} style={{ width:"100%", padding:"12px", border:"1px solid #8b5cf6", background:"#8b5cf6", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:MONO, letterSpacing:".5px", marginTop:24 }}>
                UPGRADE TO MILLIONER ▸
              </button>
            </div>

            {/* ── BILLIONAIRE ── */}
            <div className="t-panel" style={{ background:"#070708", padding:"34px 28px", fontFamily:MONO, display:"flex", flexDirection:"column", position:"relative" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:RED }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <IconCrown size={12} />
                  <span style={{ fontSize:9, fontWeight:600, color:RED, letterSpacing:"2.5px" }}>BILLIONAIRE</span>
                </div>
                <span style={{ fontSize:8, fontWeight:600, color:"#10b981", border:"1px solid #10b98135", padding:"2px 8px", letterSpacing:"1px" }}>FULL ACCESS</span>
              </div>
              <div style={{ marginBottom:6 }}>
                <span style={{ fontSize:48, fontWeight:800, letterSpacing:"-3px", color:"#f5f5f7" }}>Billionaire</span>
              </div>
              <div style={{ marginBottom:22 }}>
                <span style={{ fontSize:28, fontWeight:700, color:"#f5f5f7" }}>2.5</span>
                <span style={{ fontSize:14, color:"#5a5a63" }}> SOL / mo</span>
                <div style={{ fontSize:9, color:"#34343a", marginTop:4 }}>on-chain via Phantom · 30 days</div>
              </div>
              <div style={{ height:1, background:"#18181c", marginBottom:20 }} />
              <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:9, flex:1 }}>
                {["Everything in Millioner","AI Trading (live)","Auto-Snipe (unlimited)","Copy Trading","Custom Webhooks (Discord/Telegram)","Bundled Snipe","API Access","Advanced Alerts","Internal Wallet","Multi-Wallet Management","Priority Support","Early access to new features"].map(f => (
                  <li key={f} style={{ display:"flex", gap:9, fontSize:11, color:"#9a9aa2", alignItems:"flex-start" }}>
                    <span style={{ color:RED, flexShrink:0, fontWeight:700 }}>▸</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={open} className="btn-cmd" style={{ width:"100%", padding:"12px", border:`1px solid ${RED}`, background:RED, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:MONO, letterSpacing:".5px", marginTop:24 }}>
                UPGRADE TO BILLIONAIRE ▸
              </button>
            </div>

          </div>

          {/* Mobile responsive override */}
          <style>{`@media(max-width:860px){#pricing-grid{grid-template-columns:1fr !important}}`}</style>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:740, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <Label>FAQ</Label>
            <H2>Frequently asked</H2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              { q:"Is GEASS safe? Do you hold my private keys?", a:"No. GEASS is 100% non-custodial. Every transaction is signed in your Phantom wallet locally. We use Sign-In With Solana (SIWS) — an open standard that proves wallet ownership without granting transfer permissions. GEASS cannot move your funds, ever." },
              { q:"What's in the Free tier — actually?", a:"Alpha Scanner with live detection, KOL Feed, token launch on Pump.fun, score filtering, tier badges (S/A/B/C/Rug), and the SSE real-time stream. Login via Phantom, Telegram, or X. No credit card, no email, no expiry." },
              { q:"What does Pro add?", a:"Bundle Detector, LP Lock Verifier, TP/SL Alerts, PnL Tracker, Insider & Rug Detector, dedicated Helius RPC for priority routing, and custom AI sniping bots. Pro adds execution tooling and automation — it doesn't gate information that's already in Free." },
              { q:"How does Pro payment work?", a:"3 SOL per month, directly on-chain via Phantom. Verified by Helius in seconds. There's no recurring charge — Pro status is simply not renewed if you don't pay again. No subscriptions, no cancel flow, no support tickets." },
              { q:"What is the Bundle Detector exactly?", a:"It groups early-block purchases by wallet cluster. If 3+ wallets bought in the same Solana slot with overlapping deployer signatures, GEASS flags the token as a coordinated bundle with a risk score — visible before you make any decision." },
              { q:"How does the LP Lock Verifier work?", a:"It checks three sources in parallel: the burn address token balance, Fluxbeam lock contracts, and Streamflow vesting schedules. Returns locked%, burn%, and the locking program — displayed automatically when you open any token." },
              { q:"Can I log in without Phantom?", a:"Yes. Click 'Enter GEASS' and choose Telegram OTP or X (Twitter OAuth). For Telegram: a 6-digit one-time code sent to @geasstrade_bot. For X: standard OAuth 2.0 PKCE flow. Both give full free-tier access." },
              { q:"Is there MEV / sandwich protection?", a:"Auto-snipe routes through Jito MEV bundles by default. Your transaction is included in a private block — bots cannot front-run or sandwich it. For manual trades you can opt into Jito tipping at submission time." },
            ].map((f, i) => (
              <details key={i} className="faq-i" style={{ background:"#050506", border:"1px solid #18181c", padding:"16px 20px" }}>
                <summary style={{ fontSize:13, fontWeight:600, color:"#f5f5f7", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                  <span style={{ display:"flex", gap:9 }}><span style={{ color:RED, fontFamily:MONO }}>?</span>{f.q}</span>
                  <span className="faq-x" style={{ color:"#48484f", fontSize:20, fontWeight:300, flexShrink:0, lineHeight:1 }}>+</span>
                </summary>
                <div style={{ marginTop:13, fontSize:12, color:"#7a7a82", lineHeight:1.85, paddingLeft:18 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <div className="t-panel" style={{ background:"#050506", padding:"clamp(48px,7vw,80px) clamp(28px,6vw,64px)", textAlign:"center", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:RED }} />
            <div style={{ position:"absolute", top:-60, left:"50%", transform:"translateX(-50%)", width:400, height:400, background:`radial-gradient(circle,${RED}0c,transparent 60%)`, filter:"blur(50px)", pointerEvents:"none" }} />
            <div style={{ position:"relative" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:28 }}>
                <Sigil size={108} />
              </div>
              <h2 style={{ fontSize:"clamp(24px,4.5vw,42px)", fontWeight:800, letterSpacing:"-2px", margin:"0 0 14px", color:"#f5f5f7", textTransform:"uppercase" }}>
                Ready to see the alpha?
              </h2>
              <p style={{ fontSize:13, color:"#5a5a63", lineHeight:1.75, maxWidth:420, margin:"0 auto 36px", fontFamily:MONO }}>
                Enter in 5 seconds — Phantom, Telegram, or X. No registration. No KYC. Just on-chain intelligence.
              </p>
              <button onClick={open} className="btn-cmd" style={{ padding:"16px clamp(36px,7vw,56px)", border:`1px solid ${RED}`, background:RED, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", letterSpacing:"1px", fontFamily:MONO }}>
                ENTER GEASS ▸
              </button>
              <p style={{ marginTop:18, fontSize:9, color:"#34343a", fontFamily:MONO, letterSpacing:"1px" }}>FREE · NO_KYC · SOLANA_MAINNET · NON_CUSTODIAL</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop:"1px solid #18181c", padding:"clamp(24px,4vw,40px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <GeassLogo size={18} />
              <span style={{ fontSize:12, fontWeight:800, letterSpacing:"3px", color:"#48484f", fontFamily:MONO }}>GEASS</span>
              <span style={{ fontSize:10, color:"#2a2a30", fontFamily:MONO }}>· alpha_recon · solana</span>
            </div>
            <div style={{ display:"flex", gap:22, flexWrap:"wrap", alignItems:"center" }}>
              <a href="https://t.me/geasstrade_bot" target="_blank" rel="noopener noreferrer" className="navlink" style={{ fontSize:11, fontWeight:500, fontFamily:MONO }}>telegram</a>
              <a href="#features" className="navlink" style={{ fontSize:11, fontWeight:500, fontFamily:MONO }}>features</a>
              <a href="#pricing" className="navlink" style={{ fontSize:11, fontWeight:500, fontFamily:MONO }}>pricing</a>
              <button onClick={open} className="navlink" style={{ fontSize:11, fontWeight:500, fontFamily:MONO, background:"transparent", border:"none", cursor:"pointer" }}>enter ▸</button>
            </div>
          </div>
          <div style={{ height:1, background:"#0e0e10", marginBottom:16 }} />
          <p style={{ fontSize:10, color:"#2a2a30", fontFamily:MONO, margin:0, lineHeight:1.7 }}>
            © {new Date().getFullYear()} GEASS · Non-custodial Solana alpha terminal. Not financial advice. Trade at your own risk.
          </p>
        </div>
      </footer>
    </div>
  );
}
