"use client";

import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { GeassLogo } from "./GeassLogo";
import {
  IconSolana, IconCrown, IconSearch, IconZap, IconTarget,
  IconChart, IconShield, IconBroadcast, IconRocket, IconSpeaker, IconLock,
} from "./icons";

/* ─── Global CSS — animations + responsive breakpoints ───────── */
const GLOBAL_CSS = `
@keyframes geass-float  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-12px) rotate(1deg)} }
@keyframes geass-pulse  { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes geass-glow   { 0%,100%{box-shadow:0 0 40px #f43f5e22,0 8px 32px #8b5cf618} 50%{box-shadow:0 0 80px #f43f5e44,0 8px 48px #8b5cf630} }
@keyframes geass-fade-up{ from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
@keyframes geass-scan   { 0%{top:-2px} 100%{top:100%} }
@keyframes geass-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes geass-ping   { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2.4);opacity:0} }
@keyframes geass-shimmer{ 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes geass-border-glow { 0%,100%{opacity:.4} 50%{opacity:1} }
@keyframes geass-orb    { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.08)} 66%{transform:translate(-20px,20px) scale(.94)} }

.geass-float    { animation:geass-float  5s ease-in-out infinite }
.geass-glow     { animation:geass-glow   3s ease-in-out infinite }
.geass-fade-up  { animation:geass-fade-up .8s cubic-bezier(.16,1,.3,1) both }
.geass-ticker-track { display:flex; width:max-content; animation:geass-ticker 36s linear infinite }
.geass-ticker-track:hover { animation-play-state:paused }

/* Stagger delay helpers */
.delay-100 { animation-delay:.1s }
.delay-200 { animation-delay:.2s }
.delay-300 { animation-delay:.3s }
.delay-400 { animation-delay:.4s }

details > summary            { list-style:none }
details > summary::-webkit-details-marker { display:none }
.faq-icon                    { transition:transform .25s cubic-bezier(.16,1,.3,1); display:inline-block }
details[open] .faq-icon      { transform:rotate(45deg) }
details[open]                { background:#0f0f18 !important; border-color:#2d2d42 !important }

/* Hover effects */
.stat-card:hover { border-color:#2d2d42 !important; background:#0f0f16 !important; }
.feature-card:hover { border-color:#2d2d42 !important; transform:translateY(-2px); }
.feature-card { transition: border-color .2s ease, transform .2s ease; }
.plan-card:hover { transform:translateY(-3px); }
.plan-card { transition:transform .25s ease; }
.faq-item:hover { border-color:#1e1e2e !important; }
.step-node:hover { transform:scale(1.05); }
.step-node { transition:transform .2s ease; }
.nav-link:hover { color:#f1f5f9 !important; }
.nav-link { transition:color .15s ease; }
.cta-secondary:hover { border-color:#2d2d42 !important; color:#f1f5f9 !important; background:#0f0f16 !important; }
.cta-secondary { transition: all .2s ease; }

/* ── Layout helpers ── */
.g-hero     { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(32px,5vw,80px); align-items:center }
.g-bento    { display:grid; grid-template-columns:repeat(3,1fr); gap:16px }
.g-2col     { display:grid; grid-template-columns:1fr 1fr; gap:16px }
.g-4col     { display:grid; grid-template-columns:repeat(4,1fr) }
.g-steps    { display:grid; grid-template-columns:repeat(4,1fr); gap:0; position:relative }
.g-tg-inner { display:grid; grid-template-columns:1fr auto; gap:28px; align-items:start }
.g-social   { display:grid; grid-template-columns:repeat(3,1fr); gap:16px }
.span-2     { grid-column:span 2 }

.nav-links      { display:flex; gap:28px; align-items:center }
.nav-hamburger  { display:none !important }
.nav-mobile-cta { display:none !important }
.hero-scanner   { display:flex; justify-content:center }
.tg-mockup      {}
.steps-line     { display:block }

/* ── Tablet (≤1024px) ── */
@media (max-width:1024px) {
  .g-bento  { grid-template-columns:repeat(2,1fr) }
  .g-steps  { grid-template-columns:repeat(2,1fr); gap:32px }
  .g-social { grid-template-columns:repeat(2,1fr) }
  .steps-line { display:none }
}

/* ── Mobile (≤680px) ── */
@media (max-width:680px) {
  .g-hero     { grid-template-columns:1fr }
  .g-bento    { grid-template-columns:1fr }
  .g-2col     { grid-template-columns:1fr }
  .g-4col     { grid-template-columns:1fr 1fr }
  .g-steps    { grid-template-columns:1fr 1fr; gap:24px }
  .g-tg-inner { grid-template-columns:1fr }
  .g-social   { grid-template-columns:1fr }
  .span-2     { grid-column:span 1 }
  .nav-links       { display:none !important }
  .nav-hamburger   { display:flex !important }
  .nav-mobile-cta  { display:flex !important }
  .hero-scanner    { display:none }
  .tg-mockup       { display:none }
  .steps-line      { display:none }
}

/* ── Very small (≤380px) ── */
@media (max-width:380px) {
  .g-4col  { grid-template-columns:1fr }
  .g-steps { grid-template-columns:1fr }
}
`;

/* ─── Constants ───────────────────────────────────────────────── */
const FEED = [
  { token:"PEPE2",  act:"snipe",  kol:"Murad",     pct:"+284%", tier:"S" },
  { token:"BONK3",  act:"buy",    kol:"0xSun",     pct:"+91%",  tier:"A" },
  { token:"WIF2",   act:"launch", kol:"Ansem",     pct:"+512%", tier:"S" },
  { token:"MYRO",   act:"buy",    kol:"KingKong",  pct:"+63%",  tier:"A" },
  { token:"POPCAT", act:"snipe",  kol:"Darkfarms", pct:"+178%", tier:"S" },
  { token:"BOME",   act:"buy",    kol:"Murad",     pct:"+340%", tier:"S" },
  { token:"SLERF",  act:"snipe",  kol:"Hsaka",     pct:"+220%", tier:"S" },
  { token:"MEMU",   act:"buy",    kol:"Ansem",     pct:"+77%",  tier:"A" },
];
const TC: Record<string, string> = { S:"#10b981", A:"#3b82f6", B:"#eab308", C:"#f59e0b" };

/* ─── Helpers ─────────────────────────────────────────────────── */
const SectionLabel = ({ children }: { children: string }) => (
  <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#f43f5e0e", border:"1px solid #f43f5e22", borderRadius:24, padding:"4px 14px", fontSize:9, fontWeight:800, letterSpacing:"2.5px", color:"#f43f5e", marginBottom:18 }}>
    <span style={{ width:5, height:5, borderRadius:"50%", background:"#f43f5e", display:"inline-block" }} />
    {children}
  </div>
);

const H2 = ({ children, sub }: { children: string; sub?: string }) => (
  <div style={{ textAlign:"center", marginBottom:56 }}>
    <h2 style={{ fontSize:"clamp(24px,4vw,44px)", fontWeight:900, letterSpacing:"-1.5px", lineHeight:1.06, marginBottom: sub ? 14 : 0, color:"#f1f5f9" }}>{children}</h2>
    {sub && <p style={{ fontSize:13, color:"#475569", maxWidth:520, margin:"0 auto", lineHeight:1.75 }}>{sub}</p>}
  </div>
);

/* ─── Live ticker ─────────────────────────────────────────────── */
function Ticker() {
  const items = [...FEED, ...FEED, ...FEED, ...FEED];
  return (
    <div style={{ background:"#08080e", borderBottom:"1px solid #1e1e2e", padding:"8px 0", display:"flex", alignItems:"center", gap:16, overflow:"hidden" }}>
      <div style={{ flexShrink:0, paddingLeft:22, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ position:"relative", display:"inline-block", width:8, height:8 }}>
          <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#10b981", animation:"geass-ping 1.5s cubic-bezier(0,0,.2,1) infinite" }} />
          <span style={{ position:"relative", display:"block", width:8, height:8, borderRadius:"50%", background:"#10b981" }} />
        </span>
        <span style={{ fontSize:9, color:"#475569", fontWeight:800, letterSpacing:"2.5px" }}>LIVE</span>
      </div>
      <div style={{ flex:1, overflow:"hidden", maskImage:"linear-gradient(90deg,transparent,black 60px,black calc(100% - 60px),transparent)" }}>
        <div className="geass-ticker-track">
          {items.map((it, i) => (
            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:10, padding:"0 24px", borderRight:"1px solid #1e1e2e" }}>
              <span style={{ fontWeight:800, fontSize:8, color:TC[it.tier], background:TC[it.tier]+"18", padding:"2px 6px", borderRadius:4 }}>{it.tier}</span>
              <span style={{ color:"#94a3b8", fontWeight:700 }}>{it.token}</span>
              <span style={{ color:"#475569" }}>{it.act}</span>
              <span style={{ color:"#334155" }}>· {it.kol}</span>
              <span style={{ color:"#10b981", fontWeight:800 }}>{it.pct}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Floating scanner mockup ─────────────────────────────────── */
function ScannerPreview() {
  const rows = [
    { name:"PEPE2", mc:"$2.1M",  score:94, tier:"S", chg:"+284%", c:"#10b981" },
    { name:"WIF2",  mc:"$5.4M",  score:97, tier:"S", chg:"+512%", c:"#10b981" },
    { name:"BONK3", mc:"$840K",  score:81, tier:"A", chg:"+91%",  c:"#3b82f6" },
    { name:"MYRO",  mc:"$320K",  score:74, tier:"A", chg:"+63%",  c:"#3b82f6" },
    { name:"SLERF", mc:"$1.8M",  score:88, tier:"S", chg:"+220%", c:"#10b981" },
  ];
  return (
    <div className="geass-float" style={{ background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:20, overflow:"hidden", boxShadow:"0 48px 120px #00000099, 0 0 0 1px #ffffff06 inset, 0 0 80px #f43f5e0a", width:"100%", maxWidth:560, position:"relative" }}>
      {/* Scan line */}
      <div style={{ position:"absolute", left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#f43f5e60,transparent)", animation:"geass-scan 3s linear infinite", zIndex:2, pointerEvents:"none" }} />
      {/* Title bar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 18px", borderBottom:"1px solid #1e1e2e", background:"#08080e" }}>
        {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} style={{ width:9, height:9, borderRadius:"50%", background:c, opacity:.7 }} />)}
        <span style={{ marginLeft:10, fontSize:9, color:"#2d2d42", letterSpacing:"2px", fontWeight:700 }}>ALPHA SCANNER · GEASS</span>
        <span style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:9, color:"#10b981", fontWeight:700 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block", animation:"geass-pulse 1.6s ease-in-out infinite" }} />
          STREAMING
        </span>
      </div>
      {/* Column headers */}
      <div style={{ display:"grid", gridTemplateColumns:"36px 1fr 60px 52px 44px 60px", gap:0, padding:"6px 18px", borderBottom:"1px solid #0f0f16", background:"#09090e" }}>
        {["","TOKEN","MC","KOL","CHG","SCORE"].map(h => (
          <span key={h} style={{ fontSize:8, color:"#2d2d42", fontWeight:700, letterSpacing:"1px" }}>{h}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"36px 1fr 60px 52px 44px 60px", gap:0, padding:"10px 18px", borderBottom: i < rows.length - 1 ? "1px solid #0f0f16" : "none", background: i % 2 === 0 ? "#0a0a0f" : "#09090e" }}>
          <span style={{ fontSize:8, fontWeight:800, color:r.c, background:r.c+"18", padding:"2px 5px", borderRadius:4, alignSelf:"center", textAlign:"center" }}>{r.tier}</span>
          <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", alignSelf:"center" }}>{r.name}</span>
          <span style={{ fontSize:10, color:"#475569", alignSelf:"center" }}>{r.mc}</span>
          <span style={{ fontSize:10, color:"#334155", alignSelf:"center" }}>Murad</span>
          <span style={{ fontSize:11, fontWeight:800, color:"#10b981", alignSelf:"center" }}>{r.chg}</span>
          <div style={{ display:"flex", alignItems:"center", gap:5, alignSelf:"center" }}>
            <div style={{ flex:1, height:3, borderRadius:2, background:"#151520", overflow:"hidden" }}>
              <div style={{ width:`${r.score}%`, height:"100%", background:`linear-gradient(90deg,${r.c}70,${r.c})`, borderRadius:2 }} />
            </div>
            <span style={{ fontSize:9, color:r.c, fontWeight:700, minWidth:20 }}>{r.score}</span>
          </div>
        </div>
      ))}
      {/* Bottom glow */}
      <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:60, background:"radial-gradient(ellipse,#f43f5e15 0%,transparent 70%)", filter:"blur(20px)", pointerEvents:"none" }} />
    </div>
  );
}

/* ─── Login modal ─────────────────────────────────────────────── */
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
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#000000c0", zIndex:200, backdropFilter:"blur(8px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:201, width:"min(440px,94vw)", background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:24, boxShadow:"0 48px 120px #000000b0, 0 0 0 1px #ffffff06 inset, 0 0 60px #f43f5e0c", overflow:"hidden" }}>
        <div style={{ height:2, background:"linear-gradient(90deg,#f43f5e,#8b5cf6,#3b82f6)" }} />
        <div style={{ padding:"32px 32px 28px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <GeassLogo size={26} />
              <div>
                <div style={{ fontWeight:900, fontSize:15, letterSpacing:"2px", color:"#f1f5f9" }}>GEASS</div>
                <div style={{ fontSize:9, color:"#2d2d42", letterSpacing:"1.5px" }}>ALPHA RECON</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"#151520", border:"1px solid #1e1e2e", color:"#475569", cursor:"pointer", fontSize:18, lineHeight:1, padding:"6px 10px", borderRadius:8, transition:"all .15s" }}>×</button>
          </div>

          {tgStep==="idle" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:12, color:"#475569", marginBottom:6 }}>Choose how to access GEASS</div>
              <button onClick={doPhantom} disabled={connecting} style={{ width:"100%", padding:"15px 20px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#f43f5e,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800, cursor:connecting ? "wait" : "pointer", display:"flex", alignItems:"center", gap:12, boxShadow:"0 0 40px #f43f5e28", letterSpacing:".2px" }}>
                <IconSolana size={18} />
                {connecting ? "Connecting…" : "Connect Phantom"}
                <span style={{ marginLeft:"auto", fontSize:10, opacity:.6, fontWeight:500 }}>Solana wallet</span>
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
                <div style={{ flex:1, height:1, background:"#1e1e2e" }} />
                <span style={{ fontSize:10, color:"#2d2d42" }}>or continue with</span>
                <div style={{ flex:1, height:1, background:"#1e1e2e" }} />
              </div>
              <button onClick={doTelegram} style={{ width:"100%", padding:"14px 20px", borderRadius:12, border:"1px solid #1a3a5230", background:"#0d1e2e", color:"#38bdf8", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:18 }}>✈</span>
                Login with Telegram
                <span style={{ marginLeft:"auto", fontSize:10, opacity:.55, fontWeight:500 }}>@geasstrade_bot</span>
              </button>
              <a href="/api/auth/twitter" style={{ width:"100%", padding:"14px 20px", borderRadius:12, border:"1px solid #1e1e2e", background:"#0f0f16", color:"#94a3b8", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:12, textDecoration:"none", boxSizing:"border-box" }}>
                <span style={{ fontSize:15, fontWeight:900 }}>𝕏</span>
                Login with X
                <span style={{ marginLeft:"auto", fontSize:10, opacity:.45, fontWeight:500 }}>Twitter account</span>
              </a>
              {phErr && <div style={{ fontSize:11, color:"#f43f5e", padding:"10px 14px", background:"#f43f5e10", borderRadius:10, border:"1px solid #f43f5e22", marginTop:4 }}>{phErr}</div>}
              {tgErr && <div style={{ fontSize:11, color:"#f43f5e", marginTop:4 }}>{tgErr}</div>}
              <p style={{ fontSize:10, color:"#2d2d42", textAlign:"center", marginTop:8 }}>Non-custodial · No registration · Free to start</p>
            </div>
          )}

          {tgStep==="waiting" && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:12, color:"#94a3b8", marginBottom:16 }}>
                Open <span style={{ color:"#38bdf8", fontWeight:700 }}>@geasstrade_bot</span> on Telegram and send:
              </div>
              <div style={{ fontSize:36, fontWeight:800, letterSpacing:10, color:"#f1f5f9", fontFamily:"ui-monospace,monospace", background:"#0d1e2e", border:"1px solid #1e4060", borderRadius:14, padding:"18px 0", marginBottom:16 }}>{tgCode}</div>
              <a href={`https://t.me/geasstrade_bot?start=${tgCode}`} target="_blank" rel="noopener noreferrer" style={{ display:"inline-block", background:"#0088cc", color:"#fff", fontWeight:700, fontSize:13, borderRadius:10, padding:"11px 24px", marginBottom:14, textDecoration:"none" }}>
                Open in Telegram →
              </a>
              <p style={{ fontSize:11, color:"#475569", marginBottom:18 }}>Auto-verified once you send it…</p>
              <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setTgStep("idle"); setTgCode(""); }} style={{ fontSize:11, color:"#475569", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>Cancel</button>
              <p style={{ fontSize:10, color:"#334155", marginTop:12 }}>Bot doesn&apos;t respond? <a href="/api/auth/telegram/debug" target="_blank" rel="noopener noreferrer" style={{ color:"#38bdf8", textDecoration:"none" }}>Run diagnostics</a></p>
            </div>
          )}

          {tgStep==="done" && (
            <div style={{ textAlign:"center", padding:"28px 0" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"#10b98114", border:"1px solid #10b98138", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:26, color:"#10b981" }}>✓</div>
              <div style={{ fontSize:15, color:"#10b981", fontWeight:700 }}>Authenticated — loading GEASS…</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Feature card ────────────────────────────────────────────── */
function BCard({ icon, color, title, desc, badge, span2 }: {
  icon: React.ReactNode; color: string; title: string; desc: string; badge?: string; span2?: boolean;
}) {
  return (
    <div className={`feature-card${span2 ? " span-2" : ""}`} style={{ background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:16, padding:"26px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${color}40,transparent)` }} />
      <div style={{ position:"absolute", top:0, left:0, width:80, height:80, background:`radial-gradient(circle,${color}0a 0%,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:38, height:38, borderRadius:11, background:`${color}12`, border:`1px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span style={{ fontSize:13, fontWeight:800, color:"#f1f5f9" }}>{title}</span>
        {badge && <span style={{ fontSize:8, fontWeight:700, color, background:`${color}15`, border:`1px solid ${color}25`, padding:"2px 8px", borderRadius:6, letterSpacing:"1px" }}>{badge}</span>}
      </div>
      <p style={{ fontSize:12, color:"#475569", lineHeight:1.78, margin:0 }}>{desc}</p>
    </div>
  );
}

/* ─── Spotlight card ──────────────────────────────────────────── */
function Spot({ color, icon, badge, title, desc, bullets }: {
  color: string; icon: React.ReactNode; badge: string; title: string; desc: string; bullets: string[];
}) {
  return (
    <div className="feature-card" style={{ background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:20, padding:"36px 32px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${color}50,transparent)` }} />
      <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, background:`radial-gradient(circle,${color}08 0%,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
        <div style={{ width:50, height:50, borderRadius:14, background:`${color}12`, border:`1px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:800, color, letterSpacing:"2.5px", marginBottom:4 }}>{badge}</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#f1f5f9" }}>{title}</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:"#475569", lineHeight:1.82, marginBottom:24 }}>{desc}</p>
      <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10, margin:0, padding:0 }}>
        {bullets.map(b => (
          <li key={b} style={{ display:"flex", gap:10, fontSize:12, color:"#64748b", alignItems:"flex-start" }}>
            <span style={{ color, fontWeight:800, flexShrink:0 }}>→</span>{b}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Social proof card ───────────────────────────────────────── */
function TestimonialCard({ quote, handle, tier, gain, color }: {
  quote: string; handle: string; tier: string; gain: string; color: string;
}) {
  return (
    <div className="feature-card" style={{ background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:16, padding:"24px 22px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${color}35,transparent)` }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ display:"flex", gap:3 }}>
          {[1,2,3,4,5].map(s => <span key={s} style={{ color:"#f59e0b", fontSize:10 }}>★</span>)}
        </div>
        <span style={{ fontSize:10, fontWeight:800, color, background:`${color}15`, border:`1px solid ${color}25`, padding:"2px 8px", borderRadius:6 }}>{gain}</span>
      </div>
      <p style={{ fontSize:12, color:"#94a3b8", lineHeight:1.76, marginBottom:16, fontStyle:"italic" }}>&ldquo;{quote}&rdquo;</p>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}18`, border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color }}>
          {handle[1].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#f1f5f9" }}>{handle}</div>
          <div style={{ fontSize:9, color:"#2d2d42" }}>Tier {tier} user</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */
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
    <div style={{ background:"#050507", color:"#f1f5f9", fontFamily:"'Inter',system-ui,sans-serif", minHeight:"100vh", overflowX:"hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onConnect={onConnect} connecting={connecting} initError={loginErr} />}

      {/* ─── NAV ──────────────────────────────────────── */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"#050507e8", backdropFilter:"blur(24px)", borderBottom:"1px solid #1e1e2e" }}>
        <div style={{ display:"flex", alignItems:"center", padding:"0 clamp(16px,4vw,56px)", height:60, gap:12, maxWidth:1200, margin:"0 auto" }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
            <GeassLogo size={28} />
            <span style={{ fontWeight:900, fontSize:14, letterSpacing:"2.5px", whiteSpace:"nowrap", color:"#f1f5f9" }}>GEASS</span>
            <span style={{ fontSize:7, color:"#1e1e2e", letterSpacing:"3px", whiteSpace:"nowrap" }}>ALPHA RECON</span>
          </div>

          {/* Desktop nav */}
          <div className="nav-links">
            {(["#features","#security","#pricing"] as const).map((h, i) => (
              <a key={h} href={h} className="nav-link" style={{ fontSize:12, color:"#475569", textDecoration:"none", letterSpacing:".2px", whiteSpace:"nowrap", fontWeight:500 }}>
                {["Features","Security","Pricing"][i]}
              </a>
            ))}
            <button onClick={open} style={{ padding:"8px 22px", borderRadius:10, border:"1px solid #f43f5e40", background:"linear-gradient(135deg,#f43f5e12,#8b5cf612)", color:"#f43f5e", fontSize:12, fontWeight:800, cursor:"pointer", letterSpacing:".5px", whiteSpace:"nowrap", transition:"all .2s" }}>
              Enter App →
            </button>
          </div>

          {/* Mobile: CTA + hamburger */}
          <button onClick={open} className="nav-mobile-cta" style={{ padding:"8px 16px", borderRadius:10, border:"1px solid #f43f5e40", background:"linear-gradient(135deg,#f43f5e12,#8b5cf612)", color:"#f43f5e", fontSize:11, fontWeight:800, cursor:"pointer", alignItems:"center", justifyContent:"center" }}>
            Enter →
          </button>
          <button
            onClick={() => setMobileNav(v => !v)}
            className="nav-hamburger"
            aria-label="Menu"
            style={{ padding:"8px 10px", borderRadius:9, border:"1px solid #1e1e2e", background:"transparent", color:"#475569", cursor:"pointer", fontSize:18, lineHeight:1, alignItems:"center", justifyContent:"center" }}
          >
            {mobileNav ? "×" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileNav && (
          <div style={{ borderTop:"1px solid #1e1e2e", background:"#050507", padding:"12px clamp(16px,4vw,56px) 18px" }}>
            {(["#features","#security","#pricing"] as const).map((h, i) => (
              <a key={h} href={h} onClick={() => setMobileNav(false)} style={{ display:"block", padding:"14px 0", fontSize:15, color:"#94a3b8", textDecoration:"none", borderBottom:"1px solid #0f0f16" }}>
                {["Features","Security","Pricing"][i]}
              </a>
            ))}
          </div>
        )}
      </nav>

      <Ticker />

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{ position:"relative", padding:"clamp(64px,9vw,130px) clamp(16px,5vw,64px) clamp(48px,7vw,100px)", overflow:"hidden" }}>
        {/* Background orbs */}
        <div style={{ position:"absolute", top:-200, left:"30%", width:700, height:700, background:"radial-gradient(circle,#f43f5e0d 0%,transparent 60%)", filter:"blur(80px)", pointerEvents:"none", animation:"geass-orb 12s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:-100, right:"-5%", width:600, height:600, background:"radial-gradient(circle,#8b5cf60a 0%,transparent 65%)", filter:"blur(100px)", pointerEvents:"none", animation:"geass-orb 16s ease-in-out infinite", animationDelay:"4s" }} />
        <div style={{ position:"absolute", top:"40%", left:"-10%", width:400, height:400, background:"radial-gradient(circle,#3b82f608 0%,transparent 70%)", filter:"blur(80px)", pointerEvents:"none" }} />
        {/* Grid lines */}
        {Array.from({length:8}).map((_,i) => (
          <div key={i} style={{ position:"absolute", top:0, bottom:0, left:`${(i+1)*11.11}%`, width:1, background:"#ffffff03", pointerEvents:"none" }} />
        ))}

        <div className="g-hero" style={{ maxWidth:1160, margin:"0 auto" }}>
          {/* Left copy */}
          <div className="geass-fade-up">
            {/* Live badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#10b98110", border:"1px solid #10b98128", borderRadius:24, padding:"6px 16px", fontSize:9, color:"#10b981", fontWeight:800, marginBottom:32, letterSpacing:"2px" }}>
              <span style={{ position:"relative", display:"inline-flex", width:8, height:8 }}>
                <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#10b981", animation:"geass-ping 1.8s cubic-bezier(0,0,.2,1) infinite" }} />
                <span style={{ position:"relative", display:"block", width:8, height:8, borderRadius:"50%", background:"#10b981" }} />
              </span>
              SOLANA MAINNET · LIVE · 48ms LATENCY
            </div>

            <h1 style={{ fontSize:"clamp(36px,5.5vw,76px)", fontWeight:900, lineHeight:1.0, marginBottom:24, letterSpacing:"-2.5px" }}>
              See the alpha<br />
              <span style={{ background:"linear-gradient(128deg,#f43f5e 0%,#a855f7 50%,#8b5cf6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", display:"inline-block" }}>
                before anyone else
              </span>
            </h1>

            <p style={{ fontSize:"clamp(14px,1.6vw,17px)", color:"#475569", maxWidth:460, lineHeight:1.75, marginBottom:40 }}>
              GEASS combines Helius WebSocket detection, on-chain safety scoring, KOL tracking, and Jito-protected execution — delivering Solana alpha before it hits Twitter.
            </p>

            <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:40 }}>
              <button onClick={open} className="geass-glow" style={{ padding:"15px clamp(24px,4vw,40px)", borderRadius:12, border:"none", background:"linear-gradient(135deg,#f43f5e,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", letterSpacing:".3px" }}>
                Enter GEASS →
              </button>
              <a href="#features" className="cta-secondary" style={{ padding:"15px 24px", borderRadius:12, border:"1px solid #1e1e2e", background:"transparent", color:"#94a3b8", fontSize:14, fontWeight:600, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>
                Explore features ↓
              </a>
            </div>

            {/* Mini stats */}
            <div style={{ display:"inline-flex", gap:36, flexWrap:"wrap", padding:"20px 24px", background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:14 }}>
              {[{ v:"48ms", l:"Detection", c:"#f43f5e" },{ v:"3.2k+", l:"Tokens/day", c:"#8b5cf6" },{ v:"94%", l:"Accuracy", c:"#10b981" }].map(s => (
                <div key={s.l} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"clamp(18px,2.8vw,24px)", fontWeight:900, letterSpacing:"-1px", color:s.c, marginBottom:3 }}>{s.v}</div>
                  <div style={{ fontSize:9, color:"#334155", letterSpacing:"1px", fontWeight:600 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — scanner preview */}
          <div className="hero-scanner">
            <ScannerPreview />
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────── */}
      <section style={{ padding:"0 clamp(16px,5vw,64px) clamp(24px,4vw,48px)" }}>
        <div style={{ maxWidth:1160, margin:"0 auto", background:"linear-gradient(135deg,#0a0a0f,#0f0f16)", border:"1px solid #1e1e2e", borderRadius:20, overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#f43f5e40,#8b5cf640,transparent)" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#f43f5e18,#8b5cf618,transparent)" }} />
          <div className="g-4col">
            {[
              { v:"48ms",  l:"Detection latency",     s:"p99 WebSocket push",    c:"#f43f5e" },
              { v:"3.2k+", l:"Tokens detected / day", s:"Solana mainnet",         c:"#8b5cf6" },
              { v:"94%",   l:"Signal accuracy",        s:"S-tier 30d hit rate",   c:"#10b981" },
              { v:"12×",   l:"Avg return on S-tier",   s:"30-day trailing",       c:"#3b82f6" },
            ].map((s, i) => (
              <div key={s.l} className="stat-card" style={{ padding:"clamp(22px,3.5vw,40px) clamp(14px,2.5vw,28px)", textAlign:"center", borderRight: i < 3 ? "1px solid #1e1e2e" : "none", transition:"all .2s ease", cursor:"default" }}>
                <div style={{ fontSize:"clamp(26px,4vw,50px)", fontWeight:900, letterSpacing:"-2px", color:s.c, marginBottom:8, fontVariantNumeric:"tabular-nums" }}>{s.v}</div>
                <div style={{ fontSize:12, color:"#94a3b8", fontWeight:600, marginBottom:4 }}>{s.l}</div>
                <div style={{ fontSize:9, color:"#2d2d42", letterSpacing:".5px" }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURE BENTO ────────────────────────────── */}
      <section id="features" style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1160, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <SectionLabel>ALL FEATURES</SectionLabel>
            <H2 sub="Eight intelligence layers — from first mint to final exit. Detection, safety, automation, and execution in one platform.">
              Everything you need to win
            </H2>
          </div>

          <div className="g-bento">
            {/* Alpha Scanner — span 2 */}
            <div className="span-2 feature-card" style={{ background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:16, padding:"28px 26px 22px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#10b98148,transparent)" }} />
              <div style={{ position:"absolute", top:-30, right:-30, width:200, height:200, background:"radial-gradient(circle,#10b98108 0%,transparent 70%)", pointerEvents:"none" }} />
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:"#10b98112", border:"1px solid #10b98128", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#10b981" }}><IconSearch size={19}/></span>
                </div>
                <span style={{ fontSize:15, fontWeight:800, color:"#f1f5f9" }}>Alpha Scanner</span>
                <span style={{ fontSize:8, fontWeight:700, color:"#10b981", background:"#10b98115", border:"1px solid #10b98128", padding:"2px 8px", borderRadius:6, letterSpacing:"1px" }}>LIVE</span>
              </div>
              <p style={{ fontSize:12, color:"#475569", lineHeight:1.78, marginBottom:18, maxWidth:420 }}>
                Real-time detection of every new Solana token within 48ms of mint, scored by 20+ on-chain signals before most platforms even index the transaction.
              </p>
              <div style={{ background:"#08080e", borderRadius:12, border:"1px solid #1e1e2e", overflow:"hidden" }}>
                {[
                  { name:"PEPE2",mc:"$2.1M",score:94,tier:"S",chg:"+284%",c:"#10b981"},
                  { name:"WIF2", mc:"$5.4M",score:97,tier:"S",chg:"+512%",c:"#10b981"},
                  { name:"BONK3",mc:"$840K",score:81,tier:"A",chg:"+91%", c:"#3b82f6"},
                ].map((r, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 16px", borderBottom: i < 2 ? "1px solid #0f0f16" : "none", flexWrap:"wrap" }}>
                    <span style={{ fontSize:8, fontWeight:800, color:r.c, background:r.c+"18", padding:"2px 5px", borderRadius:4, flexShrink:0 }}>{r.tier}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", flex:1, minWidth:60 }}>{r.name}</span>
                    <span style={{ fontSize:10, color:"#475569", flexShrink:0 }}>{r.mc}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:"#10b981", flexShrink:0 }}>{r.chg}</span>
                    <div style={{ width:52, height:3, borderRadius:2, background:"#151520", overflow:"hidden", flexShrink:0 }}>
                      <div style={{ width:`${r.score}%`, height:"100%", background:`linear-gradient(90deg,${r.c}70,${r.c})`, borderRadius:2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <BCard icon={<IconBroadcast size={19}/>} color="#3b82f6" title="Live KOL Feed" desc="Watch 50+ high-alpha wallets in real-time — see their buys, sells, and launches the moment they hit the chain." />

            <BCard icon={<IconRocket size={19}/>} color="#8b5cf6" title="Token Launch" desc="Deploy tokens directly on Pump.fun in under 60 seconds. IPFS metadata upload, bonding curve configuration, all on-chain via Phantom." />

            {/* Telegram Alerts — span 2 */}
            <div className="span-2 feature-card" style={{ background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:16, padding:"28px 26px 26px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#38bdf848,transparent)" }} />
              <div className="g-tg-inner">
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:"#38bdf812", border:"1px solid #38bdf828", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ color:"#38bdf8", fontSize:19 }}>✈</span>
                    </div>
                    <span style={{ fontSize:15, fontWeight:800, color:"#f1f5f9" }}>Telegram Alerts</span>
                    <span style={{ fontSize:8, fontWeight:700, color:"#38bdf8", background:"#38bdf815", border:"1px solid #38bdf825", padding:"2px 8px", borderRadius:6, letterSpacing:"1px" }}>NEW</span>
                  </div>
                  <p style={{ fontSize:12, color:"#475569", lineHeight:1.78, marginBottom:16, maxWidth:360 }}>
                    Connect @geasstrade_bot for instant TP/SL hits, snipe confirmations, and whale alerts — straight to your phone without opening the app.
                  </p>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {["/status","/alerts","/pnl","/disconnect"].map(c => (
                      <span key={c} style={{ fontSize:10, color:"#38bdf8", background:"#38bdf80e", border:"1px solid #38bdf820", padding:"4px 10px", borderRadius:7, fontFamily:"ui-monospace,monospace", fontWeight:700 }}>{c}</span>
                    ))}
                  </div>
                </div>
                <div className="tg-mockup" style={{ background:"#090f1a", border:"1px solid #1a3a54", borderRadius:14, padding:"16px 18px", minWidth:200, flexShrink:0 }}>
                  <div style={{ fontSize:9, color:"#38bdf8", fontWeight:700, marginBottom:12, letterSpacing:"1px" }}>@geasstrade_bot</div>
                  {[
                    { e:"🎯", msg:"TP hit: WIF2 +120%",   c:"#10b981" },
                    { e:"⚡", msg:"Snipe ok: PEPE2",        c:"#38bdf8" },
                    { e:"🐋", msg:"Whale buy: $340K BOME", c:"#8b5cf6" },
                  ].map((m, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 0", borderBottom: i < 2 ? "1px solid #1a3a50" : "none" }}>
                      <span style={{ fontSize:14 }}>{m.e}</span>
                      <span style={{ fontSize:11, color:m.c, flex:1, fontWeight:600 }}>{m.msg}</span>
                      <span style={{ fontSize:8, color:"#1e3a50" }}>now</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <BCard icon={<IconSearch size={19}/>}  color="#f59e0b" title="Bundle Detector"   desc="Groups early-block buys by wallet cluster. Flags coordinated launches with a risk score before you open any position." badge="NEW" />
            <BCard icon={<IconTarget size={19}/>}  color="#f43f5e" title="TP / SL Alerts"   desc="Set take-profit and stop-loss % on any trade. GEASS monitors price on-chain and fires a Telegram alert the moment a threshold is hit." badge="NEW" />
            <BCard icon={<IconChart size={19}/>}   color="#10b981" title="PnL Tracker"      desc="Track realized gains and losses across all GEASS trades. Token-by-token breakdown and cumulative SOL P&L in the Trades tab." badge="NEW" />
            <BCard icon={<IconLock size={19}/>}    color="#8b5cf6" title="LP Lock Verifier" desc="Checks burn address, Fluxbeam, and Streamflow in parallel. Shows locked% and burn% so you can assess rug risk at a glance." badge="NEW" />
          </div>
        </div>
      </section>

      {/* ─── SAFETY SPOTLIGHT ─────────────────────────── */}
      <section id="security" style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 70% 50% at 50% 50%,#f59e0b05 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1160, margin:"0 auto", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <SectionLabel>SAFETY TOOLS</SectionLabel>
            <H2 sub="GEASS runs security checks automatically on every token — so you know before you ape.">
              Know before you trade
            </H2>
          </div>
          <div className="g-2col">
            <Spot color="#f59e0b" icon={<IconSearch size={23}/>} badge="BUNDLE DETECTOR"
              title="Spot coordinated launches instantly"
              desc="GEASS groups early-block transactions by wallet cluster. If 3+ wallets bought in the same slot with the same deployer signature pattern — it's flagged as a bundle before you even see the token card."
              bullets={["Groups buys by Solana slot + deployer","Flags early holder overlap patterns","Shows bundle count and risk level","Integrated into every token detail card"]}
            />
            <Spot color="#8b5cf6" icon={<IconLock size={23}/>} badge="LP LOCK VERIFIER"
              title="Liquidity safety in every token"
              desc="Checks three sources in parallel: burn address holdings, Fluxbeam lock contracts, and Streamflow vesting schedules. Displays locked% and burn% directly on the token panel — automatically."
              bullets={["Checks burn address + Fluxbeam + Streamflow","Real-time locked% and burn% display","Distinguishes burned vs. time-locked LP","Auto-runs when any token panel opens"]}
            />
          </div>
        </div>
      </section>

      {/* ─── AUTOMATION SPOTLIGHT ─────────────────────── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 70% 50% at 50% 50%,#f43f5e05 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1160, margin:"0 auto", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <SectionLabel>AUTOMATION</SectionLabel>
            <H2 sub="Set your rules once. GEASS monitors the chain 24/7 and notifies you the moment it matters.">
              Trade smarter, not harder
            </H2>
          </div>
          <div className="g-2col">
            <Spot color="#f43f5e" icon={<IconTarget size={23}/>} badge="TP / SL ALERTS"
              title="Never miss your exit again"
              desc="After any snipe in GEASS, set a take-profit % and a stop-loss %. The system watches the bonding curve price and fires an instant Telegram notification the moment either threshold is crossed."
              bullets={["Configure TP% and SL% per position","Continuously monitors price on-chain","Fires Telegram notification on hit","Manage all active rules from Settings"]}
            />
            <Spot color="#10b981" icon={<IconChart size={23}/>} badge="PNL TRACKER"
              title="Know your actual performance"
              desc="Every trade executed in GEASS is recorded — entry price, size, and outcome. View per-token realized P&L breakdowns and cumulative SOL gain/loss in the Trades tab, synced across devices."
              bullets={["Records every buy and sell automatically","Calculates realized SOL P&L per trade","Cumulative totals and per-token filters","Redis-backed — synced across sessions"]}
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <H2 sub="Four intelligence layers fire in under 200ms — from on-chain event to your decision point.">
              From mint to position in seconds
            </H2>
          </div>
          <div className="g-steps">
            <div className="steps-line" style={{ position:"absolute", top:40, left:"12%", right:"12%", height:1, background:"linear-gradient(90deg,#f43f5e30,#f59e0b30,#3b82f630,#10b98130)", pointerEvents:"none" }} />
            {[
              { n:"01", title:"Detect",  color:"#f43f5e", desc:"Helius WebSocket pushes new mints in ~48ms — first to know, first to act." },
              { n:"02", title:"Enrich",  color:"#f59e0b", desc:"Bonding curve, holder count, mint authority, LP lock status — scored in parallel." },
              { n:"03", title:"Score",   color:"#3b82f6", desc:"20+ signals produce an S/A/B/C/Rug tier badge in under 100ms." },
              { n:"04", title:"Execute", color:"#10b981", desc:"One-click buy or auto-snipe via Jito MEV-protected bundle." },
            ].map((s) => (
              <div key={s.n} style={{ padding:"0 20px", textAlign:"center" }}>
                <div className="step-node" style={{ width:80, height:80, borderRadius:"50%", background:`${s.color}10`, border:`1px solid ${s.color}28`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", position:"relative", boxShadow:`0 0 32px ${s.color}10` }}>
                  <div style={{ position:"absolute", inset:-4, borderRadius:"50%", border:`1px solid ${s.color}18` }} />
                  <span style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.n}</span>
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:"#f1f5f9", marginBottom:10 }}>{s.title}</div>
                <div style={{ fontSize:12, color:"#475569", lineHeight:1.75 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─────────────────────────────── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 40% at 50% 50%,#8b5cf605 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1160, margin:"0 auto", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <SectionLabel>SOCIAL PROOF</SectionLabel>
            <H2 sub="Traders across Solana are already using GEASS to get the edge.">
              What the community says
            </H2>
          </div>
          <div className="g-social">
            <TestimonialCard
              quote="Caught WIF2 at $180K MC — sold at $2.4M. The S-tier badge and KOL overlap was the signal. Nothing comes close to this latency."
              handle="@degensol_"
              tier="S"
              gain="+1,233%"
              color="#10b981"
            />
            <TestimonialCard
              quote="The bundle detector saved me twice in one week. Both tokens rugged within hours. Those red flags are not noise — they're real."
              handle="@on_chain_kai"
              tier="A"
              gain="2 rugs avoided"
              color="#f43f5e"
            />
            <TestimonialCard
              quote="TP alerts on Telegram are a game-changer. Set it and forget it — no need to watch charts. Just got pinged at +120% on SLERF automatically."
              handle="@sol_flywheel"
              tier="S"
              gain="+120% auto-exit"
              color="#8b5cf6"
            />
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────── */}
      <section id="pricing" style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 70% at 50% 50%,#8b5cf607 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:820, margin:"0 auto", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <SectionLabel>PRICING</SectionLabel>
            <H2 sub="Free tier is genuinely free — no time limits, no credit card. Pro adds automation, safety tools, and priority execution.">
              Simple. On-chain. Transparent.
            </H2>
          </div>
          <div className="g-2col">

            {/* Free */}
            <div className="plan-card" style={{ background:"#0a0a0f", border:"1px solid #1e1e2e", borderRadius:22, padding:"36px 32px" }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#2d2d42", letterSpacing:"2.5px", marginBottom:22 }}>FREE FOREVER</div>
              <div style={{ marginBottom:28 }}>
                <span style={{ fontSize:56, fontWeight:900, letterSpacing:"-3px", color:"#f1f5f9" }}>0</span>
                <span style={{ fontSize:18, color:"#475569", fontWeight:400 }}> SOL</span>
                <div style={{ fontSize:10, color:"#2d2d42", marginTop:6 }}>No credit card · no signup · no expiry</div>
              </div>
              <div style={{ height:1, background:"#1e1e2e", marginBottom:24 }} />
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:12, marginBottom:32, padding:0 }}>
                {["Alpha Scanner — live detection","Live KOL Feed — whale tracking","Token Launch on Pump.fun","Score filtering & tier badges","SSE real-time stream","Telegram + X login"].map(f => (
                  <li key={f} style={{ display:"flex", gap:10, fontSize:12, color:"#64748b", alignItems:"flex-start" }}>
                    <span style={{ color:"#10b981", fontWeight:800, flexShrink:0, marginTop:1 }}>↗</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={open} className="cta-secondary" style={{ width:"100%", padding:"14px", borderRadius:11, border:"1px solid #1e1e2e", background:"transparent", color:"#94a3b8", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Start Free →
              </button>
            </div>

            {/* Pro */}
            <div className="plan-card" style={{ background:"linear-gradient(160deg,#0d0b18,#0a0a12)", border:"1px solid #2d1f4a", borderRadius:22, padding:"36px 32px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#f43f5e,#8b5cf6,#3b82f6)" }} />
              <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 90% 55% at 50% 0%,#8b5cf60c 0%,transparent 60%)", pointerEvents:"none" }} />
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <IconCrown size={14} style={{ color:"#a855f7" }} />
                    <span style={{ fontSize:9, fontWeight:800, color:"#a855f7", letterSpacing:"2.5px" }}>GEASS PRO</span>
                  </div>
                  <span style={{ fontSize:8, fontWeight:700, color:"#10b981", background:"#10b98115", border:"1px solid #10b98128", padding:"2px 10px", borderRadius:8, letterSpacing:"1px" }}>LIVE</span>
                </div>
                <div style={{ marginBottom:28 }}>
                  <span style={{ fontSize:56, fontWeight:900, letterSpacing:"-3px", color:"#f1f5f9" }}>3</span>
                  <span style={{ fontSize:18, color:"#475569", fontWeight:400 }}> SOL</span>
                  <span style={{ fontSize:12, color:"#334155" }}> / month</span>
                  <div style={{ fontSize:10, color:"#334155", marginTop:6 }}>Paid on-chain via Phantom · cancel anytime</div>
                </div>
                <div style={{ height:1, background:"#1a1228", marginBottom:24 }} />
                <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:12, marginBottom:32, padding:0 }}>
                  {[
                    ["Everything in Free",           "#a78bfa"],
                    ["Bundle Detector",               "#f59e0b"],
                    ["LP Lock Verifier",              "#8b5cf6"],
                    ["TP / SL Alerts",                "#f43f5e"],
                    ["PnL Tracker",                   "#10b981"],
                    ["Insider & Rug Detector",        "#a78bfa"],
                    ["Dedicated Helius RPC priority", "#a78bfa"],
                    ["Custom AI Sniping Bots",        "#a78bfa"],
                  ].map(([f, c]) => (
                    <li key={f} style={{ display:"flex", gap:10, fontSize:12, color:c, alignItems:"flex-start" }}>
                      <span style={{ color: c === "#a78bfa" ? "#8b5cf6" : c, fontWeight:800, flexShrink:0, marginTop:1 }}>↗</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={open} style={{ width:"100%", padding:"14px", borderRadius:11, border:"none", background:"linear-gradient(135deg,#f43f5e,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"0 0 40px #f43f5e20" }}>
                  Enter & Upgrade →
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:740, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel>FAQ</SectionLabel>
            <H2>Frequently asked</H2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
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
              <details key={i} className="faq-item" style={{ background:"#0a0a0f", border:"1px solid #151520", borderRadius:14, padding:"18px 22px", cursor:"pointer", transition:"all .2s ease" }}>
                <summary style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                  <span>{f.q}</span>
                  <span className="faq-icon" style={{ color:"#2d2d42", fontSize:22, fontWeight:300, flexShrink:0, lineHeight:1 }}>+</span>
                </summary>
                <div style={{ marginTop:14, fontSize:12, color:"#64748b", lineHeight:1.85 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────── */}
      <section style={{ padding:"clamp(48px,7vw,96px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <div style={{ background:"linear-gradient(160deg,#0a0a0f,#0d0b18)", border:"1px solid #1e1e2e", borderRadius:28, padding:"clamp(48px,7vw,88px) clamp(28px,6vw,72px)", textAlign:"center", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 55% at 50% 0%,#f43f5e0c 0%,transparent 60%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#f43f5e50,#8b5cf650,transparent)" }} />
            <div style={{ position:"absolute", bottom:-60, left:"50%", transform:"translateX(-50%)", width:"80%", height:120, background:"radial-gradient(ellipse,#8b5cf610 0%,transparent 70%)", filter:"blur(30px)", pointerEvents:"none" }} />
            <div style={{ position:"relative" }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#f43f5e18,#8b5cf618)", border:"1px solid #f43f5e28", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
                <GeassLogo size={32} />
              </div>
              <h2 style={{ fontSize:"clamp(22px,4.5vw,40px)", fontWeight:900, letterSpacing:"-1.5px", margin:"0 0 16px", background:"linear-gradient(128deg,#f1f5f9 30%,#94a3b8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Ready to see the alpha?
              </h2>
              <p style={{ fontSize:14, color:"#475569", lineHeight:1.78, maxWidth:420, margin:"0 auto 40px" }}>
                Enter in 5 seconds — Phantom, Telegram, or X. No registration. No KYC. Just on-chain intelligence on Solana.
              </p>
              <button onClick={open} className="geass-glow" style={{ padding:"17px clamp(36px,7vw,60px)", borderRadius:13, border:"none", background:"linear-gradient(135deg,#f43f5e,#8b5cf6)", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", letterSpacing:".3px" }}>
                Enter GEASS →
              </button>
              <p style={{ marginTop:20, fontSize:10, color:"#1e1e2e" }}>Free · No KYC · Solana mainnet · non-custodial</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────── */}
      <footer style={{ borderTop:"1px solid #1e1e2e", padding:"clamp(24px,4vw,40px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1160, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <GeassLogo size={18} />
              <span style={{ fontSize:12, fontWeight:900, letterSpacing:"2.5px", color:"#2d2d42" }}>GEASS</span>
              <span style={{ fontSize:10, color:"#1e1e2e" }}>· Alpha Recon · Solana</span>
            </div>
            <div style={{ display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
              <a href="https://t.me/geasstrade_bot" target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#2d2d42", textDecoration:"none", fontWeight:500 }}>Telegram Bot</a>
              <a href="#features" style={{ fontSize:11, color:"#2d2d42", textDecoration:"none", fontWeight:500 }}>Features</a>
              <a href="#pricing" style={{ fontSize:11, color:"#2d2d42", textDecoration:"none", fontWeight:500 }}>Pricing</a>
            </div>
          </div>
          <div style={{ borderTop:"1px solid #0f0f16", paddingTop:18, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <span style={{ fontSize:10, color:"#1e1e2e" }}>© 2025 GEASS. All rights reserved.</span>
            <span style={{ fontSize:10, color:"#1e1e2e" }}>Trading crypto carries risk. GEASS signals are informational only — not financial advice.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
