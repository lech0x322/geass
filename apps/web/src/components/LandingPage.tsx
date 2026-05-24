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
@keyframes geass-float  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(1deg)} }
@keyframes geass-pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes geass-glow   { 0%,100%{box-shadow:0 0 40px #dc262625} 50%{box-shadow:0 0 80px #dc262650} }
@keyframes geass-fade-up{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes geass-scan   { 0%{top:-2px} 100%{top:100%} }
@keyframes geass-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes geass-ping   { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2.4);opacity:0} }

.geass-float    { animation:geass-float  4.5s ease-in-out infinite }
.geass-glow     { animation:geass-glow   3s   ease-in-out infinite }
.geass-fade-up  { animation:geass-fade-up .75s ease both }
.geass-ticker-track { display:flex; width:max-content; animation:geass-ticker 32s linear infinite }
.geass-ticker-track:hover { animation-play-state:paused }

details > summary            { list-style:none }
details > summary::-webkit-details-marker { display:none }
.faq-icon                    { transition:transform .2s ease; display:inline-block }
details[open] .faq-icon      { transform:rotate(45deg) }

/* ── Layout helpers ── */
.g-hero     { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(32px,5vw,64px); align-items:center }
.g-bento    { display:grid; grid-template-columns:repeat(3,1fr); gap:12px }
.g-2col     { display:grid; grid-template-columns:1fr 1fr; gap:14px }
.g-4col     { display:grid; grid-template-columns:repeat(4,1fr) }
.g-steps    { display:grid; grid-template-columns:repeat(4,1fr); gap:0; position:relative }
.g-tg-inner { display:grid; grid-template-columns:1fr auto; gap:24px; align-items:start }
.span-2     { grid-column:span 2 }

.nav-links      { display:flex; gap:24px; align-items:center }
.nav-hamburger  { display:none !important }
.nav-mobile-cta { display:none !important }
.hero-scanner   { display:flex; justify-content:center }
.tg-mockup      {}
.steps-line     { display:block }

/* ── Tablet (≤1024px) ── */
@media (max-width:1024px) {
  .g-bento  { grid-template-columns:repeat(2,1fr) }
  .g-steps  { grid-template-columns:repeat(2,1fr); gap:32px }
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
const Label = ({ children }: { children: string }) => (
  <div style={{ fontSize:9, fontWeight:800, letterSpacing:"2.5px", color:"#3f3f46", marginBottom:14 }}>{children}</div>
);

const H2 = ({ children, sub }: { children: string; sub?: string }) => (
  <div style={{ textAlign:"center", marginBottom:52 }}>
    <h2 style={{ fontSize:"clamp(22px,4vw,40px)", fontWeight:900, letterSpacing:"-1.5px", lineHeight:1.08, marginBottom: sub?12:0 }}>{children}</h2>
    {sub && <p style={{ fontSize:13, color:"#52525b", maxWidth:500, margin:"0 auto", lineHeight:1.7 }}>{sub}</p>}
  </div>
);

/* ─── Live ticker ─────────────────────────────────────────────── */
function Ticker() {
  const items = [...FEED, ...FEED, ...FEED, ...FEED];
  return (
    <div style={{ background:"#090910", borderBottom:"1px solid #111118", padding:"7px 0", display:"flex", alignItems:"center", gap:16, overflow:"hidden" }}>
      <div style={{ flexShrink:0, paddingLeft:22, display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ position:"relative", display:"inline-block", width:7, height:7 }}>
          <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#10b981", animation:"geass-ping 1.5s cubic-bezier(0,0,.2,1) infinite" }} />
          <span style={{ position:"relative", display:"block", width:7, height:7, borderRadius:"50%", background:"#10b981" }} />
        </span>
        <span style={{ fontSize:9, color:"#3f3f46", fontWeight:800, letterSpacing:"2px" }}>LIVE</span>
      </div>
      <div style={{ flex:1, overflow:"hidden", maskImage:"linear-gradient(90deg,transparent,black 60px,black calc(100% - 60px),transparent)" }}>
        <div className="geass-ticker-track">
          {items.map((it, i) => (
            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:10, padding:"0 22px", borderRight:"1px solid #131320" }}>
              <span style={{ fontWeight:800, fontSize:8, color:TC[it.tier], background:TC[it.tier]+"18", padding:"1px 5px", borderRadius:4 }}>{it.tier}</span>
              <span style={{ color:"#c4c4cc", fontWeight:700 }}>{it.token}</span>
              <span style={{ color:"#3f3f46" }}>{it.act}</span>
              <span style={{ color:"#52525b" }}>· {it.kol}</span>
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
    <div className="geass-float" style={{ background:"#0c0c11", border:"1px solid #1e1e2c", borderRadius:18, overflow:"hidden", boxShadow:"0 48px 120px #00000099, 0 0 0 1px #ffffff07 inset", width:"100%", maxWidth:560, position:"relative" }}>
      <div style={{ position:"absolute", left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#dc262650,transparent)", animation:"geass-scan 2.8s linear infinite", zIndex:2, pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderBottom:"1px solid #111118", background:"#09090e" }}>
        {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} style={{ width:8, height:8, borderRadius:"50%", background:c }} />)}
        <span style={{ marginLeft:10, fontSize:9, color:"#242433", letterSpacing:"1.5px", fontWeight:700 }}>ALPHA SCANNER · GEASS</span>
        <span style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#10b981", fontWeight:700 }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:"#10b981", display:"inline-block", animation:"geass-pulse 1.6s ease-in-out infinite" }} />
          STREAMING
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"36px 1fr 56px 52px 40px 52px", gap:0, padding:"5px 16px", borderBottom:"1px solid #0e0e18" }}>
        {["","TOKEN","MC","KOL","CHG","SCORE"].map(h => (
          <span key={h} style={{ fontSize:8, color:"#242433", fontWeight:700, letterSpacing:"1px" }}>{h}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"36px 1fr 56px 52px 40px 52px", gap:0, padding:"9px 16px", borderBottom: i<rows.length-1?"1px solid #0d0d16":"none", background: i%2===0?"#0c0c11":"#0b0b0f" }}>
          <span style={{ fontSize:8, fontWeight:800, color:r.c, background:r.c+"18", padding:"2px 5px", borderRadius:4, alignSelf:"center", textAlign:"center" }}>{r.tier}</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#e4e4e7", alignSelf:"center" }}>{r.name}</span>
          <span style={{ fontSize:9, color:"#3f3f46", alignSelf:"center" }}>{r.mc}</span>
          <span style={{ fontSize:9, color:"#52525b", alignSelf:"center" }}>Murad</span>
          <span style={{ fontSize:10, fontWeight:800, color:"#10b981", alignSelf:"center" }}>{r.chg}</span>
          <div style={{ display:"flex", alignItems:"center", gap:5, alignSelf:"center" }}>
            <div style={{ flex:1, height:3, borderRadius:2, background:"#1a1a26", overflow:"hidden" }}>
              <div style={{ width:`${r.score}%`, height:"100%", background:`linear-gradient(90deg,${r.c}80,${r.c})`, borderRadius:2 }} />
            </div>
            <span style={{ fontSize:9, color:r.c, fontWeight:700, minWidth:18 }}>{r.score}</span>
          </div>
        </div>
      ))}
      <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"70%", height:50, background:"radial-gradient(ellipse,#dc262618 0%,transparent 70%)", filter:"blur(16px)", pointerEvents:"none" }} />
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
      const { code, webhookOk } = await r.json() as { code:string; webhookOk?:boolean };
      if (webhookOk === false) {
        setTgErr("Bot webhook error — please visit /api/auth/telegram/debug then retry.");
        return;
      }
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
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#000000b0", zIndex:200, backdropFilter:"blur(6px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:201, width:"min(420px,93vw)", background:"#0e0e14", border:"1px solid #22222e", borderRadius:22, boxShadow:"0 48px 120px #00000099, 0 0 0 1px #ffffff07 inset", overflow:"hidden" }}>
        <div style={{ height:2, background:"linear-gradient(90deg,#dc2626,#a855f7,#7c3aed)" }} />
        <div style={{ padding:"28px 28px 26px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <GeassLogo size={24} />
              <div>
                <div style={{ fontWeight:900, fontSize:14, letterSpacing:"1.5px" }}>GEASS</div>
                <div style={{ fontSize:9, color:"#3f3f46", letterSpacing:"1px" }}>ALPHA RECON</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#3f3f46", cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 4px" }}>×</button>
          </div>

          {tgStep==="idle" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:11, color:"#52525b", marginBottom:4 }}>Choose how to enter GEASS</div>
              <button onClick={doPhantom} disabled={connecting} style={{ width:"100%", padding:"14px 18px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#dc2626,#7c3aed)", color:"#fff", fontSize:13, fontWeight:800, cursor:connecting?"wait":"pointer", display:"flex", alignItems:"center", gap:10, boxShadow:"0 0 40px #dc262630" }}>
                <IconSolana size={17} />
                {connecting ? "Connecting…" : "Connect Phantom"}
                <span style={{ marginLeft:"auto", fontSize:10, opacity:.55, fontWeight:500 }}>Solana wallet</span>
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"2px 0" }}>
                <div style={{ flex:1, height:1, background:"#1c1c26" }} />
                <span style={{ fontSize:10, color:"#2a2a3a" }}>or continue with</span>
                <div style={{ flex:1, height:1, background:"#1c1c26" }} />
              </div>
              <button onClick={doTelegram} style={{ width:"100%", padding:"13px 18px", borderRadius:12, border:"1px solid #1e4a6030", background:"#0d2030", color:"#38bdf8", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18 }}>✈</span>
                Login with Telegram
                <span style={{ marginLeft:"auto", fontSize:10, opacity:.5, fontWeight:500 }}>@geasstrade_bot</span>
              </button>
              <a href="/api/auth/twitter" style={{ width:"100%", padding:"13px 18px", borderRadius:12, border:"1px solid #ffffff12", background:"#ffffff07", color:"#e2e8f0", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:10, textDecoration:"none", boxSizing:"border-box" }}>
                <span style={{ fontSize:15, fontWeight:900 }}>𝕏</span>
                Login with X
                <span style={{ marginLeft:"auto", fontSize:10, opacity:.45, fontWeight:500 }}>Twitter account</span>
              </a>
              {phErr && <div style={{ fontSize:11, color:"#ef4444", padding:"9px 12px", background:"#ef444412", borderRadius:8, border:"1px solid #ef444422", marginTop:2 }}>{phErr}</div>}
              {tgErr && <div style={{ fontSize:11, color:"#ef4444", marginTop:2 }}>{tgErr}</div>}
              <p style={{ fontSize:10, color:"#1e1e2c", textAlign:"center", marginTop:6 }}>Non-custodial · No registration · Free to start</p>
            </div>
          )}

          {tgStep==="waiting" && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#71717a", marginBottom:14 }}>
                Open <span style={{ color:"#38bdf8", fontWeight:700 }}>@geasstrade_bot</span> on Telegram and send:
              </div>
              <div style={{ fontSize:36, fontWeight:800, letterSpacing:10, color:"#f4f4f5", fontFamily:"ui-monospace,monospace", background:"#0c1e2e", border:"1px solid #1e4060", borderRadius:12, padding:"16px 0", marginBottom:12 }}>{tgCode}</div>
              <a
                href={`https://t.me/geasstrade_bot?start=${tgCode}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display:"inline-block", background:"#0088cc", color:"#fff", fontWeight:700, fontSize:13, borderRadius:10, padding:"10px 22px", marginBottom:12, textDecoration:"none" }}
              >
                Open in Telegram →
              </a>
              <p style={{ fontSize:10, color:"#52525b", marginBottom:16 }}>Auto-verified once you send it…</p>
              <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setTgStep("idle"); setTgCode(""); }} style={{ fontSize:11, color:"#3f3f46", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>Cancel</button>
            </div>
          )}

          {tgStep==="done" && (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"#10b98118", border:"1px solid #10b98140", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:24, color:"#10b981" }}>✓</div>
              <div style={{ fontSize:14, color:"#10b981", fontWeight:700 }}>Authenticated — loading GEASS…</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Bento card ──────────────────────────────────────────────── */
function BCard({ icon, color, title, desc, badge, span2 }: {
  icon: React.ReactNode; color: string; title: string; desc: string; badge?: string; span2?: boolean;
}) {
  return (
    <div className={span2 ? "span-2" : undefined} style={{ background:"#0c0c11", border:"1px solid #1a1a26", borderRadius:18, padding:"24px 22px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${color}35,transparent)` }} />
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:13 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${color}14`, border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span style={{ fontSize:13, fontWeight:800, color:"#e4e4e7" }}>{title}</span>
        {badge && <span style={{ fontSize:8, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}28`, padding:"2px 8px", borderRadius:6 }}>{badge}</span>}
      </div>
      <p style={{ fontSize:11, color:"#52525b", lineHeight:1.75, margin:0 }}>{desc}</p>
    </div>
  );
}

/* ─── Spotlight card ──────────────────────────────────────────── */
function Spot({ color, icon, badge, title, desc, bullets }: {
  color: string; icon: React.ReactNode; badge: string; title: string; desc: string; bullets: string[];
}) {
  return (
    <div style={{ background:"#0c0c11", border:"1px solid #1a1a26", borderRadius:20, padding:"32px 28px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${color}45,transparent)` }} />
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <div style={{ width:46, height:46, borderRadius:13, background:`${color}14`, border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:800, color, letterSpacing:"2px", marginBottom:3 }}>{badge}</div>
          <div style={{ fontSize:15, fontWeight:800, color:"#e4e4e7" }}>{title}</div>
        </div>
      </div>
      <p style={{ fontSize:12, color:"#52525b", lineHeight:1.8, marginBottom:20 }}>{desc}</p>
      <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:9, margin:0, padding:0 }}>
        {bullets.map(b => (
          <li key={b} style={{ display:"flex", gap:10, fontSize:11, color:"#71717a", alignItems:"flex-start" }}>
            <span style={{ color, fontWeight:800, flexShrink:0 }}>→</span>{b}
          </li>
        ))}
      </ul>
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
    <div style={{ background:"#07070b", color:"#f4f4f5", fontFamily:"'Inter',system-ui,sans-serif", minHeight:"100vh", overflowX:"hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onConnect={onConnect} connecting={connecting} initError={loginErr} />}

      {/* ─── NAV ──────────────────────────────────────── */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"#07070bdc", backdropFilter:"blur(20px)", borderBottom:"1px solid #111118" }}>
        <div style={{ display:"flex", alignItems:"center", padding:"0 clamp(16px,4vw,48px)", height:56, gap:12 }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
            <GeassLogo size={26} />
            <span style={{ fontWeight:900, fontSize:13, letterSpacing:"2px", whiteSpace:"nowrap" }}>GEASS</span>
            <span style={{ fontSize:7, color:"#1c1c28", letterSpacing:"3px", whiteSpace:"nowrap" }}>ALPHA RECON</span>
          </div>

          {/* Desktop nav */}
          <div className="nav-links">
            {(["#features","#security","#pricing"] as const).map((h, i) => (
              <a key={h} href={h} style={{ fontSize:11, color:"#3f3f46", textDecoration:"none", letterSpacing:".3px", whiteSpace:"nowrap" }}>
                {["Features","Security","Pricing"][i]}
              </a>
            ))}
            <button onClick={open} style={{ padding:"7px 20px", borderRadius:8, border:"1px solid #dc262650", background:"linear-gradient(135deg,#dc262614,#7c3aed14)", color:"#ef4444", fontSize:11, fontWeight:800, cursor:"pointer", letterSpacing:".5px", whiteSpace:"nowrap" }}>
              Enter App →
            </button>
          </div>

          {/* Mobile: CTA + hamburger */}
          <button onClick={open} className="nav-mobile-cta" style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #dc262650", background:"linear-gradient(135deg,#dc262614,#7c3aed14)", color:"#ef4444", fontSize:11, fontWeight:800, cursor:"pointer", alignItems:"center", justifyContent:"center" }}>
            Enter →
          </button>
          <button
            onClick={() => setMobileNav(v => !v)}
            className="nav-hamburger"
            aria-label="Menu"
            style={{ padding:"8px 10px", borderRadius:8, border:"1px solid #1e1e28", background:"transparent", color:"#71717a", cursor:"pointer", fontSize:18, lineHeight:1, alignItems:"center", justifyContent:"center" }}
          >
            {mobileNav ? "×" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileNav && (
          <div style={{ borderTop:"1px solid #111118", background:"#07070b", padding:"12px clamp(16px,4vw,48px) 16px" }}>
            {(["#features","#security","#pricing"] as const).map((h, i) => (
              <a key={h} href={h} onClick={() => setMobileNav(false)} style={{ display:"block", padding:"12px 0", fontSize:15, color:"#71717a", textDecoration:"none", borderBottom:"1px solid #0f0f18" }}>
                {["Features","Security","Pricing"][i]}
              </a>
            ))}
          </div>
        )}
      </nav>

      <Ticker />

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{ position:"relative", padding:"clamp(56px,8vw,120px) clamp(16px,5vw,64px) clamp(40px,6vw,80px)", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-160, left:"50%", transform:"translateX(-50%)", width:900, height:600, background:"radial-gradient(ellipse,#dc262610 0%,transparent 65%)", filter:"blur(80px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, right:"-5%", width:500, height:500, background:"radial-gradient(ellipse,#7c3aed0c 0%,transparent 70%)", filter:"blur(100px)", pointerEvents:"none" }} />
        {Array.from({length:7}).map((_,i)=>(
          <div key={i} style={{ position:"absolute", top:0, bottom:0, left:`${(i+1)*14.28}%`, width:1, background:"#ffffff03", pointerEvents:"none" }} />
        ))}

        <div className="g-hero" style={{ maxWidth:1100, margin:"0 auto" }}>
          {/* Left copy */}
          <div className="geass-fade-up">
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#10b98112", border:"1px solid #10b98130", borderRadius:24, padding:"5px 16px", fontSize:9, color:"#10b981", fontWeight:800, marginBottom:28, letterSpacing:"1.5px" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block", animation:"geass-pulse 1.8s ease-in-out infinite" }} />
              SOLANA MAINNET · LIVE · 48ms LATENCY
            </div>

            <h1 style={{ fontSize:"clamp(34px,5.2vw,72px)", fontWeight:900, lineHeight:1.02, marginBottom:22, letterSpacing:"-2px" }}>
              See the alpha<br />
              <span style={{ background:"linear-gradient(125deg,#ef4444 0%,#a855f7 45%,#7c3aed 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", display:"inline-block" }}>
                before anyone else
              </span>
            </h1>

            <p style={{ fontSize:"clamp(13px,1.5vw,16px)", color:"#52525b", maxWidth:440, lineHeight:1.72, marginBottom:36 }}>
              GEASS combines Helius WebSocket detection, on-chain safety scoring, KOL tracking, and Jito-protected execution — delivering Solana alpha before it hits Twitter.
            </p>

            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:28 }}>
              <button onClick={open} className="geass-glow" style={{ padding:"14px clamp(22px,4vw,36px)", borderRadius:11, border:"none", background:"linear-gradient(135deg,#dc2626,#7c3aed)", color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", letterSpacing:".3px" }}>
                Enter GEASS →
              </button>
              <a href="#features" style={{ padding:"14px 22px", borderRadius:11, border:"1px solid #1e1e28", background:"transparent", color:"#71717a", fontSize:13, fontWeight:600, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>
                Explore features ↓
              </a>
            </div>

            <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
              {[{ v:"48ms", l:"Detection" },{ v:"3.2k+", l:"Tokens/day" },{ v:"94%", l:"Accuracy" }].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize:"clamp(18px,3vw,22px)", fontWeight:900, letterSpacing:"-1px", background:"linear-gradient(135deg,#ef4444,#a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{s.v}</div>
                  <div style={{ fontSize:9, color:"#3f3f46", letterSpacing:".5px", marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — scanner preview (hidden on mobile via CSS) */}
          <div className="hero-scanner">
            <ScannerPreview />
          </div>
        </div>
      </section>

      {/* ─── FEATURE BENTO ────────────────────────────── */}
      <section id="features" style={{ padding:"clamp(40px,6vw,88px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <Label>ALL FEATURES</Label>
            <H2 sub="Eight intelligence layers — from first mint to final exit. Detection, safety, automation, and execution in one platform.">
              Everything you need to win
            </H2>
          </div>

          <div className="g-bento">
            {/* Alpha Scanner — span 2 */}
            <div className="span-2" style={{ background:"#0c0c11", border:"1px solid #1a1a26", borderRadius:18, padding:"26px 26px 20px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#10b98145,transparent)" }} />
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"#10b98114", border:"1px solid #10b98130", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#10b981" }}><IconSearch size={18}/></span>
                </div>
                <span style={{ fontSize:14, fontWeight:800, color:"#e4e4e7" }}>Alpha Scanner</span>
                <span style={{ fontSize:8, fontWeight:700, color:"#10b981", background:"#10b98118", border:"1px solid #10b98130", padding:"2px 8px", borderRadius:6 }}>LIVE</span>
              </div>
              <p style={{ fontSize:11, color:"#52525b", lineHeight:1.75, marginBottom:16, maxWidth:380 }}>
                Real-time detection of every new Solana token within 48ms of mint, scored by 20+ on-chain signals before most platforms even index the transaction.
              </p>
              <div style={{ background:"#09090d", borderRadius:10, border:"1px solid #111118", overflow:"hidden" }}>
                {[
                  { name:"PEPE2",mc:"$2.1M",score:94,tier:"S",chg:"+284%",c:"#10b981"},
                  { name:"WIF2", mc:"$5.4M",score:97,tier:"S",chg:"+512%",c:"#10b981"},
                  { name:"BONK3",mc:"$840K",score:81,tier:"A",chg:"+91%", c:"#3b82f6"},
                ].map((r,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderBottom:i<2?"1px solid #0d0d16":"none", flexWrap:"wrap" }}>
                    <span style={{ fontSize:8,fontWeight:800,color:r.c,background:r.c+"18",padding:"2px 5px",borderRadius:4,flexShrink:0 }}>{r.tier}</span>
                    <span style={{ fontSize:11,fontWeight:700,color:"#e4e4e7",flex:1,minWidth:60 }}>{r.name}</span>
                    <span style={{ fontSize:9,color:"#3f3f46",flexShrink:0 }}>{r.mc}</span>
                    <span style={{ fontSize:10,fontWeight:800,color:"#10b981",flexShrink:0 }}>{r.chg}</span>
                    <div style={{ width:48,height:3,borderRadius:2,background:"#1a1a26",overflow:"hidden",flexShrink:0 }}>
                      <div style={{ width:`${r.score}%`,height:"100%",background:`linear-gradient(90deg,${r.c}80,${r.c})`,borderRadius:2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <BCard icon={<IconBroadcast size={18}/>} color="#3b82f6" title="Live KOL Feed" desc="Watch 50+ high-alpha wallets in real-time — see their buys, sells, and launches the moment they hit the chain." />

            <BCard icon={<IconRocket size={18}/>} color="#a855f7" title="Token Launch" desc="Deploy tokens directly on Pump.fun in under 60 seconds. IPFS metadata upload, bonding curve configuration, all on-chain via Phantom." />

            {/* Telegram Alerts — span 2 */}
            <div className="span-2" style={{ background:"#0c0c11", border:"1px solid #1a1a26", borderRadius:18, padding:"26px 26px 24px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#38bdf845,transparent)" }} />
              <div className="g-tg-inner">
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:"#38bdf814", border:"1px solid #38bdf830", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ color:"#38bdf8", fontSize:18 }}>✈</span>
                    </div>
                    <span style={{ fontSize:14, fontWeight:800, color:"#e4e4e7" }}>Telegram Alerts</span>
                    <span style={{ fontSize:8, fontWeight:700, color:"#38bdf8", background:"#38bdf818", border:"1px solid #38bdf828", padding:"2px 8px", borderRadius:6 }}>NEW</span>
                  </div>
                  <p style={{ fontSize:11, color:"#52525b", lineHeight:1.75, marginBottom:14, maxWidth:340 }}>
                    Connect @geasstrade_bot for instant TP/SL hits, snipe confirmations, and whale alerts — straight to your phone without opening the app.
                  </p>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {["/status","/alerts","/pnl","/disconnect"].map(c=>(
                      <span key={c} style={{ fontSize:10, color:"#38bdf8", background:"#38bdf810", border:"1px solid #38bdf820", padding:"3px 9px", borderRadius:6, fontFamily:"monospace", fontWeight:700 }}>{c}</span>
                    ))}
                  </div>
                </div>
                {/* Message mockup — hidden on mobile via CSS */}
                <div className="tg-mockup" style={{ background:"#0a1e2e", border:"1px solid #1e4060", borderRadius:14, padding:"14px 16px", minWidth:188, flexShrink:0 }}>
                  <div style={{ fontSize:9, color:"#38bdf8", fontWeight:700, marginBottom:10, letterSpacing:".5px" }}>@geasstrade_bot</div>
                  {[
                    { e:"🎯", msg:"TP hit: WIF2 +120%",   c:"#10b981" },
                    { e:"⚡", msg:"Snipe ok: PEPE2",        c:"#38bdf8" },
                    { e:"🐋", msg:"Whale buy: $340K BOME", c:"#a855f7" },
                  ].map((m,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:i<2?"1px solid #1e3a50":"none" }}>
                      <span style={{ fontSize:14 }}>{m.e}</span>
                      <span style={{ fontSize:10, color:m.c, flex:1, fontWeight:600 }}>{m.msg}</span>
                      <span style={{ fontSize:8, color:"#1e3a50" }}>now</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <BCard icon={<IconSearch size={18}/>}  color="#f59e0b" title="Bundle Detector"   desc="Groups early-block buys by wallet cluster. Flags coordinated launches with a risk score before you open any position." badge="NEW" />
            <BCard icon={<IconTarget size={18}/>}  color="#ef4444" title="TP / SL Alerts"   desc="Set take-profit and stop-loss % on any trade. GEASS monitors price on-chain and fires a Telegram alert the moment a threshold is hit." badge="NEW" />
            <BCard icon={<IconChart size={18}/>}   color="#10b981" title="PnL Tracker"      desc="Track realized gains and losses across all GEASS trades. Token-by-token breakdown and cumulative SOL P&L in the Trades tab." badge="NEW" />
            <BCard icon={<IconLock size={18}/>}    color="#8b5cf6" title="LP Lock Verifier" desc="Checks burn address, Fluxbeam, and Streamflow in parallel. Shows locked% and burn% so you can assess rug risk at a glance." badge="NEW" />
          </div>
        </div>
      </section>

      {/* ─── SAFETY SPOTLIGHT ─────────────────────────── */}
      <section id="security" style={{ padding:"clamp(40px,6vw,88px) clamp(16px,5vw,64px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 70% 50% at 50% 50%,#f59e0b06 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <Label>SAFETY TOOLS</Label>
            <H2 sub="GEASS runs security checks automatically on every token — so you know before you ape.">
              Know before you trade
            </H2>
          </div>
          <div className="g-2col">
            <Spot color="#f59e0b" icon={<IconSearch size={22}/>} badge="BUNDLE DETECTOR"
              title="Spot coordinated launches instantly"
              desc="GEASS groups early-block transactions by wallet cluster. If 3+ wallets bought in the same slot with the same deployer signature pattern — it's flagged as a bundle before you even see the token card."
              bullets={["Groups buys by Solana slot + deployer","Flags early holder overlap patterns","Shows bundle count and risk level","Integrated into every token detail card"]}
            />
            <Spot color="#8b5cf6" icon={<IconLock size={22}/>} badge="LP LOCK VERIFIER"
              title="Liquidity safety in every token"
              desc="Checks three sources in parallel: burn address holdings, Fluxbeam lock contracts, and Streamflow vesting schedules. Displays locked% and burn% directly on the token panel — automatically."
              bullets={["Checks burn address + Fluxbeam + Streamflow","Real-time locked% and burn% display","Distinguishes burned vs. time-locked LP","Auto-runs when any token panel opens"]}
            />
          </div>
        </div>
      </section>

      {/* ─── AUTOMATION SPOTLIGHT ─────────────────────── */}
      <section style={{ padding:"clamp(40px,6vw,88px) clamp(16px,5vw,64px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 70% 50% at 50% 50%,#dc262606 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <Label>AUTOMATION</Label>
            <H2 sub="Set your rules once. GEASS monitors the chain 24/7 and notifies you the moment it matters.">
              Trade smarter, not harder
            </H2>
          </div>
          <div className="g-2col">
            <Spot color="#ef4444" icon={<IconTarget size={22}/>} badge="TP / SL ALERTS"
              title="Never miss your exit again"
              desc="After any snipe in GEASS, set a take-profit % and a stop-loss %. The system watches the bonding curve price and fires an instant Telegram notification the moment either threshold is crossed."
              bullets={["Configure TP% and SL% per position","Continuously monitors price on-chain","Fires Telegram notification on hit","Manage all active rules from Settings"]}
            />
            <Spot color="#10b981" icon={<IconChart size={22}/>} badge="PNL TRACKER"
              title="Know your actual performance"
              desc="Every trade executed in GEASS is recorded — entry price, size, and outcome. View per-token realized P&L breakdowns and cumulative SOL gain/loss in the Trades tab, synced across devices."
              bullets={["Records every buy and sell automatically","Calculates realized SOL P&L per trade","Cumulative totals and per-token filters","Redis-backed — synced across sessions"]}
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────── */}
      <section style={{ padding:"clamp(40px,6vw,88px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <Label>HOW IT WORKS</Label>
            <H2 sub="Four intelligence layers fire in under 200ms — from on-chain event to your decision point.">
              From mint to position in seconds
            </H2>
          </div>
          <div className="g-steps">
            <div className="steps-line" style={{ position:"absolute", top:34, left:"12%", right:"12%", height:1, background:"linear-gradient(90deg,#ef444422,#f59e0b22,#3b82f622,#10b98122)", pointerEvents:"none" }} />
            {[
              { n:"01", title:"Detect",  color:"#ef4444", desc:"Helius WebSocket pushes new mints in ~48ms — first to know, first to act." },
              { n:"02", title:"Enrich",  color:"#f59e0b", desc:"Bonding curve, holder count, mint authority, LP lock status — scored in parallel." },
              { n:"03", title:"Score",   color:"#3b82f6", desc:"20+ signals produce an S/A/B/C/Rug tier badge in under 100ms." },
              { n:"04", title:"Execute", color:"#10b981", desc:"One-click buy or auto-snipe via Jito MEV-protected bundle." },
            ].map((s) => (
              <div key={s.n} style={{ padding:"0 16px", textAlign:"center" }}>
                <div style={{ width:68, height:68, borderRadius:"50%", background:`${s.color}12`, border:`1px solid ${s.color}28`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", position:"relative" }}>
                  <div style={{ position:"absolute", inset:-1, borderRadius:"50%", border:`1px solid ${s.color}`, opacity:.25 }} />
                  <span style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.n}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:800, color:"#e4e4e7", marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:11, color:"#3f3f46", lineHeight:1.75 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────── */}
      <section style={{ padding:"0 clamp(16px,5vw,64px) clamp(40px,6vw,88px)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", background:"#0c0c11", border:"1px solid #1a1a26", borderRadius:20, overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#dc262638,#7c3aed38,transparent)" }} />
          <div className="g-4col">
            {[
              { v:"48ms",  l:"Detection latency",    s:"p99 WebSocket push"   },
              { v:"3.2k+", l:"Tokens detected / day", s:"Solana mainnet"       },
              { v:"94%",   l:"Signal accuracy",       s:"S-tier 30d hit rate"  },
              { v:"12×",   l:"Avg return on S-tier",  s:"30-day trailing"      },
            ].map((s,i) => (
              <div key={s.l} style={{ padding:"clamp(20px,3vw,32px) clamp(12px,2vw,24px)", textAlign:"center", borderRight:i<3?"1px solid #131320":"none" }}>
                <div style={{ fontSize:"clamp(24px,4vw,46px)", fontWeight:900, letterSpacing:"-2px", background:"linear-gradient(135deg,#ef4444,#a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:6 }}>{s.v}</div>
                <div style={{ fontSize:11, color:"#a1a1aa", fontWeight:600, marginBottom:3 }}>{s.l}</div>
                <div style={{ fontSize:9, color:"#2a2a38" }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────── */}
      <section id="pricing" style={{ padding:"clamp(40px,6vw,88px) clamp(16px,5vw,64px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 70% at 50% 50%,#7c3aed07 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:800, margin:"0 auto", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <Label>PRICING</Label>
            <H2 sub="Free tier is genuinely free — no time limits, no credit card. Pro adds automation, safety tools, and priority execution.">
              Simple. On-chain. Transparent.
            </H2>
          </div>
          <div className="g-2col">

            {/* Free */}
            <div style={{ background:"#0c0c11", border:"1px solid #1a1a26", borderRadius:22, padding:"32px 28px" }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#27272a", letterSpacing:"2.5px", marginBottom:20 }}>FREE FOREVER</div>
              <div style={{ marginBottom:24 }}>
                <span style={{ fontSize:52, fontWeight:900, letterSpacing:"-3px" }}>0</span>
                <span style={{ fontSize:17, color:"#3f3f46", fontWeight:400 }}> SOL</span>
                <div style={{ fontSize:10, color:"#27272a", marginTop:4 }}>No credit card · no signup · no expiry</div>
              </div>
              <div style={{ height:1, background:"#131320", marginBottom:22 }} />
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10, marginBottom:28, padding:0 }}>
                {["Alpha Scanner — live detection","Live KOL Feed — whale tracking","Token Launch on Pump.fun","Score filtering & tier badges","SSE real-time stream","Telegram + X login"].map(f => (
                  <li key={f} style={{ display:"flex", gap:10, fontSize:11, color:"#52525b", alignItems:"flex-start" }}>
                    <span style={{ color:"#10b981", fontWeight:800, flexShrink:0, marginTop:1 }}>↗</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={open} style={{ width:"100%", padding:"13px", borderRadius:11, border:"1px solid #1e1e28", background:"transparent", color:"#71717a", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Start Free →
              </button>
            </div>

            {/* Pro */}
            <div style={{ background:"#0d0b15", border:"1px solid #2d1f4a", borderRadius:22, padding:"32px 28px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#dc2626,#a855f7,#7c3aed)" }} />
              <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 90% 55% at 50% 0%,#7c3aed0c 0%,transparent 60%)", pointerEvents:"none" }} />
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <IconCrown size={13} style={{ color:"#a855f7" }} />
                    <span style={{ fontSize:9, fontWeight:800, color:"#a855f7", letterSpacing:"2.5px" }}>GEASS PRO</span>
                  </div>
                  <span style={{ fontSize:8, fontWeight:700, color:"#10b981", background:"#10b98118", border:"1px solid #10b98130", padding:"2px 9px", borderRadius:8 }}>LIVE</span>
                </div>
                <div style={{ marginBottom:24 }}>
                  <span style={{ fontSize:52, fontWeight:900, letterSpacing:"-3px" }}>3</span>
                  <span style={{ fontSize:17, color:"#52525b", fontWeight:400 }}> SOL</span>
                  <span style={{ fontSize:11, color:"#3f3f46" }}> / month</span>
                  <div style={{ fontSize:10, color:"#3f3f46", marginTop:4 }}>Paid on-chain via Phantom · cancel anytime</div>
                </div>
                <div style={{ height:1, background:"#1a1228", marginBottom:22 }} />
                <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10, marginBottom:28, padding:0 }}>
                  {[
                    ["Everything in Free",           "#c4b5fd"],
                    ["Bundle Detector",               "#f59e0b"],
                    ["LP Lock Verifier",              "#8b5cf6"],
                    ["TP / SL Alerts",                "#ef4444"],
                    ["PnL Tracker",                   "#10b981"],
                    ["Insider & Rug Detector",        "#c4b5fd"],
                    ["Dedicated Helius RPC priority", "#c4b5fd"],
                    ["Custom AI Sniping Bots",        "#c4b5fd"],
                  ].map(([f,c]) => (
                    <li key={f} style={{ display:"flex", gap:10, fontSize:11, color:c, alignItems:"flex-start" }}>
                      <span style={{ color: c==="#c4b5fd" ? "#a855f7" : c, fontWeight:800, flexShrink:0, marginTop:1 }}>↗</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={open} style={{ width:"100%", padding:"13px", borderRadius:11, border:"none", background:"linear-gradient(135deg,#dc2626,#7c3aed)", color:"#fff", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"0 0 32px #dc262628" }}>
                  Enter & Upgrade →
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────── */}
      <section style={{ padding:"clamp(40px,6vw,88px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
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
            ].map((f,i) => (
              <details key={i} style={{ background:"#0c0c11", border:"1px solid #131320", borderRadius:12, padding:"16px 20px", cursor:"pointer" }}>
                <summary style={{ fontSize:12, fontWeight:700, color:"#e4e4e7", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                  <span>{f.q}</span>
                  <span className="faq-icon" style={{ color:"#3f3f46", fontSize:20, fontWeight:300, flexShrink:0 }}>+</span>
                </summary>
                <div style={{ marginTop:12, fontSize:11, color:"#71717a", lineHeight:1.82 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────── */}
      <section style={{ padding:"clamp(40px,6vw,88px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:700, margin:"0 auto" }}>
          <div style={{ background:"#0c0c11", border:"1px solid #1e1e2c", borderRadius:26, padding:"clamp(40px,6vw,80px) clamp(24px,5vw,64px)", textAlign:"center", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 55% at 50% 0%,#dc262610 0%,transparent 65%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#dc262645,#7c3aed45,transparent)" }} />
            <div style={{ position:"relative" }}>
              <GeassLogo size={54} />
              <h2 style={{ fontSize:"clamp(20px,4vw,34px)", fontWeight:900, letterSpacing:"-1.5px", margin:"20px 0 14px" }}>Ready to see the alpha?</h2>
              <p style={{ fontSize:13, color:"#52525b", lineHeight:1.75, maxWidth:400, margin:"0 auto 36px" }}>
                Enter in 5 seconds — Phantom, Telegram, or X. No registration. No KYC. Just on-chain intelligence on Solana.
              </p>
              <button onClick={open} className="geass-glow" style={{ padding:"16px clamp(32px,6vw,52px)", borderRadius:12, border:"none", background:"linear-gradient(135deg,#dc2626,#7c3aed)", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", letterSpacing:".3px" }}>
                Enter GEASS →
              </button>
              <p style={{ marginTop:18, fontSize:10, color:"#1a1a28" }}>Free · No KYC · Solana mainnet · non-custodial</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────── */}
      <footer style={{ borderTop:"1px solid #0f0f18", padding:"clamp(20px,3vw,36px) clamp(16px,5vw,64px)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <GeassLogo size={16} />
            <span style={{ fontSize:11, fontWeight:900, letterSpacing:"2px", color:"#27272a" }}>GEASS</span>
            <span style={{ fontSize:10, color:"#1a1a28" }}>· Alpha Recon · Solana</span>
          </div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap", alignItems:"center" }}>
            <a href="https://t.me/geasstrade_bot" target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:"#27272a", textDecoration:"none" }}>Telegram Bot</a>
            <span style={{ fontSize:10, color:"#1a1a28" }}>Trading crypto carries risk. GEASS signals are informational only — not financial advice.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
