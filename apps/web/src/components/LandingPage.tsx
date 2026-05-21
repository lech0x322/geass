"use client";

import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { GeassLogo } from "./GeassLogo";
import {
  IconSearch, IconZap, IconTarget, IconChart,
  IconSparkle, IconBroadcast, IconRocket, IconCrown, IconSolana,
} from "./icons";

interface Props {
  onConnect: () => Promise<void>;
  connecting: boolean;
}

const STATS = [
  { v: "48ms",  l: "Detection latency" },
  { v: "3.2k+", l: "Tokens / day" },
  { v: "94%",   l: "Signal accuracy" },
  { v: "12x",   l: "Avg on S-Tier" },
];

const FREE_FEATURES = [
  "Alpha Scanner — live token detection",
  "Live KOL Feed — track whale wallets",
  "Token Launch on Pump.fun",
  "Score filtering & tier badges",
  "SSE real-time stream",
];

const PRO_FEATURES: { Icon: FC<{ size?: number }>; title: string; desc: string }[] = [
  { Icon: IconSearch, title: "Insider & Rug Detector",          desc: "Advanced on-chain analysis detects insider wallets, coordinated buys and rug patterns before they hit Twitter." },
  { Icon: IconZap,    title: "Dedicated RPC + Helius Priority",  desc: "Skip the queue. Your requests go through dedicated Helius nodes — first to detect, first to snipe." },
  { Icon: IconTarget, title: "Custom AI Rules & Sniping Bots",  desc: "Define your own entry conditions. Automate buys based on score, KOL activity, bonding curve progress." },
  { Icon: IconChart,  title: "Portfolio Analytics + Risk Tools", desc: "Real-time P&L, exposure by tier, drawdown alerts, and AI-generated risk scores per position." },
];

const FEED_ITEMS = [
  { token: "PEPE2",   action: "snipe",  wallet: "Murad",     pct: "+284%", tier: "S" },
  { token: "BONK3",   action: "buy",    wallet: "0xSun",     pct: "+91%",  tier: "A" },
  { token: "WIF2",    action: "launch", wallet: "Ansem",     pct: "+512%", tier: "S" },
  { token: "MYRO",    action: "buy",    wallet: "KingKong",  pct: "+63%",  tier: "A" },
  { token: "POPCAT",  action: "snipe",  wallet: "Darkfarms", pct: "+178%", tier: "S" },
  { token: "BOME",    action: "buy",    wallet: "Murad",     pct: "+340%", tier: "S" },
];

const TIER_COLOR: Record<string, string> = { S: "#10b981", A: "#3b82f6", B: "#eab308" };

function LiveFeedTicker() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset(p => (p + 1) % (FEED_ITEMS.length * 60)), 40);
    return () => clearInterval(id);
  }, []);
  const items = [...FEED_ITEMS, ...FEED_ITEMS];
  return (
    <div style={{ overflow: "hidden", position: "relative", height: 32, maskImage: "linear-gradient(90deg,transparent,black 80px,black calc(100% - 80px),transparent)" }}>
      <div style={{ display: "flex", gap: 24, position: "absolute", whiteSpace: "nowrap", transform: `translateX(-${offset}px)`, transition: "transform 40ms linear" }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: "#52525b" }}>
            <span style={{ color: TIER_COLOR[item.tier] ?? "#52525b", fontWeight: 800, fontSize: 9, background: (TIER_COLOR[item.tier] ?? "#52525b") + "18", padding: "1px 5px", borderRadius: 4 }}>{item.tier}</span>
            <span style={{ color: "#a1a1aa", fontWeight: 700 }}>{item.token}</span>
            <span style={{ color: "#3f3f46" }}>{item.action}</span>
            <span style={{ color: "#52525b" }}>by {item.wallet}</span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>{item.pct}</span>
            <span style={{ color: "#27272a", marginLeft: 8 }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ScanGrid() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${(i + 1) * 12.5}%`, height: 1, background: "#ffffff04" }} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i + 1) * 16.666}%`, width: 1, background: "#ffffff04" }} />
      ))}
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, #dc262618 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 400, height: 300, background: "radial-gradient(ellipse, #7c3aed10 0%, transparent 70%)", filter: "blur(60px)" }} />
    </div>
  );
}

export function LandingPage({ onConnect, connecting }: Props) {
  const [connectError, setConnectError] = useState("");
  const [connectHint, setConnectHint] = useState("");
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleConnect = async () => {
    setConnectError("");
    setConnectHint("");
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setConnectHint("Check your Phantom extension — waiting for approval"), 2000);
    try {
      await onConnect();
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      setConnectHint("");
    }
  };

  return (
    <div style={{ background: "#07070a", color: "#f4f4f5", fontFamily: "'Inter',system-ui,sans-serif", minHeight: "100vh", overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#07070acc", backdropFilter: "blur(16px)", borderBottom: "1px solid #111115", display: "flex", alignItems: "center", padding: "0 32px", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <GeassLogo size={24} />
          <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: "2px" }}>GEASS</span>
          <span style={{ fontSize: 7, color: "#27272a", letterSpacing: "3px", marginLeft: 4, paddingTop: 1 }}>ALPHA RECON</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <a href="#features" style={{ fontSize: 11, color: "#3f3f46", textDecoration: "none", letterSpacing: ".3px" }}>Features</a>
          <a href="#pricing"  style={{ fontSize: 11, color: "#3f3f46", textDecoration: "none", letterSpacing: ".3px" }}>Pricing</a>
          <button onClick={handleConnect} disabled={connecting}
            style={{ padding: "6px 18px", borderRadius: 7, border: "1px solid #dc262650", background: "#dc26260e", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: connecting ? "wait" : "pointer", letterSpacing: ".5px" }}>
            {connecting ? "Connecting…" : "Enter App →"}
          </button>
        </div>
      </nav>

      {/* LIVE TICKER */}
      <div style={{ background: "#0c0c0f", borderBottom: "1px solid #111115", padding: "6px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flexShrink: 0, paddingLeft: 24, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981" }} />
          <span style={{ fontSize: 9, color: "#3f3f46", fontWeight: 700, letterSpacing: "1.5px" }}>LIVE</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <LiveFeedTicker />
        </div>
      </div>

      {/* HERO */}
      <section style={{ position: "relative", padding: "100px 32px 80px", textAlign: "center", overflow: "hidden" }}>
        <ScanGrid />

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#10b98110", border: "1px solid #10b98128", borderRadius: 20, padding: "4px 14px", fontSize: 9, color: "#10b981", fontWeight: 700, marginBottom: 32, letterSpacing: "1.5px" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          SOLANA MAINNET · LIVE
        </div>

        <h1 style={{ fontSize: "clamp(36px,7vw,80px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 24, letterSpacing: "-2px", position: "relative" }}>
          See the alpha<br />
          <span style={{ background: "linear-gradient(125deg, #ef4444 0%, #a855f7 50%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>
            before anyone else
          </span>
        </h1>

        <p style={{ fontSize: "clamp(13px,1.8vw,17px)", color: "#52525b", maxWidth: 480, margin: "0 auto 44px", lineHeight: 1.65, position: "relative" }}>
          GEASS monitors on-chain signals, KOL wallets, and bonding curves in real-time — so you enter before the crowd.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
          <button onClick={handleConnect} disabled={connecting}
            style={{ padding: "14px 36px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: connecting ? "wait" : "pointer", letterSpacing: ".3px", boxShadow: "0 0 48px #dc262638, 0 2px 0 #0004 inset", display: "inline-flex", alignItems: "center", gap: 9 }}>
            {connecting ? "Connecting wallet…" : <><IconSolana size={15} /> Connect Phantom — Enter GEASS</>}
          </button>
          <a href="#features"
            style={{ padding: "14px 24px", borderRadius: 10, border: "1px solid #1e1e24", background: "transparent", color: "#71717a", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            See features ↓
          </a>
        </div>

        {connectHint  && <div style={{ marginTop: 14, fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>{connectHint}</div>}
        {connectError && <div style={{ marginTop: 10,  fontSize: 11, color: "#ef4444" }}>{connectError}</div>}
        <p style={{ marginTop: 16, fontSize: 10, color: "#27272a", letterSpacing: ".3px" }}>No registration · Sign with Phantom · Free to start</p>

        {/* Decorative scanner preview */}
        <div style={{ marginTop: 72, position: "relative", maxWidth: 680, margin: "72px auto 0" }}>
          <div style={{ background: "#0e0e12", border: "1px solid #1a1a20", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px #00000080" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #111115", background: "#0b0b0e" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#eab308" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ marginLeft: 8, fontSize: 9, color: "#27272a", letterSpacing: "1px" }}>ALPHA SCANNER · LIVE FEED</span>
              <span style={{ marginLeft: "auto", fontSize: 9, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                STREAMING
              </span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {[
                { name: "PEPE2",  mc: "$2.1M",  score: 94, tier: "S", chg: "+284%", kol: "Murad",    color: "#10b981" },
                { name: "BONK3",  mc: "$840K",  score: 81, tier: "A", chg: "+91%",  kol: "0xSun",    color: "#3b82f6" },
                { name: "WIF2",   mc: "$5.4M",  score: 97, tier: "S", chg: "+512%", kol: "Ansem",    color: "#10b981" },
                { name: "MYRO",   mc: "$320K",  score: 74, tier: "A", chg: "+63%",  kol: "KingKong", color: "#3b82f6" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: i < 3 ? "1px solid #0d0d10" : "none" }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: row.color, background: row.color + "18", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{row.tier}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#e4e4e7", flex: 1 }}>{row.name}</span>
                  <span style={{ fontSize: 9, color: "#3f3f46" }}>MC {row.mc}</span>
                  <span style={{ fontSize: 9, color: "#52525b" }}>KOL: <span style={{ color: "#a1a1aa" }}>{row.kol}</span></span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", minWidth: 48, textAlign: "right" }}>{row.chg}</span>
                  <div style={{ width: 48, height: 4, borderRadius: 2, background: "#1a1a20", overflow: "hidden", flexShrink: 0 }}>
                    <div style={{ width: `${row.score}%`, height: "100%", background: `linear-gradient(90deg, ${row.color}80, ${row.color})`, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: row.color, fontWeight: 700, minWidth: 20 }}>{row.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)", width: "80%", height: 80, background: "radial-gradient(ellipse, #dc262620 0%, transparent 70%)", filter: "blur(20px)", pointerEvents: "none" }} />
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: "64px 32px" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 1, background: "#111115", borderRadius: 16, overflow: "hidden", border: "1px solid #111115" }}>
          {STATS.map((s, i) => (
            <div key={s.l} style={{ background: "#09090c", padding: "28px 20px", textAlign: "center", position: "relative" }}>
              {i < STATS.length - 1 && (
                <div style={{ position: "absolute", top: "20%", right: 0, bottom: "20%", width: 1, background: "#111115" }} />
              )}
              <div style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 900, letterSpacing: "-1.5px", background: "linear-gradient(135deg, #ef4444, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 6, letterSpacing: ".5px" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 9, color: "#3f3f46", letterSpacing: "2px", fontWeight: 700, marginBottom: 12 }}>FREE TIER</div>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 10 }}>Core Intelligence</h2>
            <p style={{ fontSize: 12, color: "#3f3f46", maxWidth: 400, margin: "0 auto" }}>Everything you need to find alpha — no credit card, no signup</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 2, background: "#0f0f12", borderRadius: 16, overflow: "hidden", border: "1px solid #111115" }}>
            {([
              { Icon: IconSparkle,   label: "Alpha Scanner", desc: "Real-time detection of Solana tokens with growth potential. Scored by 20+ on-chain signals via Helius + DexScreener.", accent: "#10b981" },
              { Icon: IconBroadcast, label: "Live KOL Feed",  desc: "Watch exactly what high-performing wallets are buying and selling, the moment it happens on-chain.", accent: "#3b82f6" },
              { Icon: IconRocket,    label: "Token Launch",   desc: "Create and deploy tokens directly on Pump.fun in under 60 seconds. 100% on-chain via Phantom.", accent: "#a855f7" },
            ] as { Icon: FC<{ size?: number }>; label: string; desc: string; accent: string }[]).map(f => (
              <div key={f.label} style={{ background: "#09090c", padding: "32px 28px", position: "relative" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.accent + "14", border: `1px solid ${f.accent}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ color: f.accent }}><f.Icon size={22} /></span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#e4e4e7" }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "#3f3f46", lineHeight: 1.7 }}>{f.desc}</div>
                <div style={{ position: "absolute", bottom: 0, left: 28, right: 28, height: 1, background: `linear-gradient(90deg, transparent, ${f.accent}28, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRO */}
      <section style={{ padding: "0 32px 80px", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 80% at 50% 50%, #7c3aed08 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, color: "#a855f7", fontWeight: 700, letterSpacing: "2px", marginBottom: 12 }}>
              <IconCrown size={12} /> GEASS PRO
            </div>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 10 }}>Weapons-grade intelligence</h2>
            <p style={{ fontSize: 12, color: "#3f3f46", maxWidth: 400, margin: "0 auto" }}>For serious traders who need the edge before the crowd does</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            {PRO_FEATURES.map(f => (
              <div key={f.title} style={{ background: "#0b0b0f", border: "1px solid #1a1228", borderRadius: 14, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #7c3aed40, transparent)" }} />
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#7c3aed14", border: "1px solid #7c3aed28", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <span style={{ color: "#a855f7" }}><f.Icon size={18} /></span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#d4bfff", marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 10, color: "#3f3f46", lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3vw,32px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 48 }}>Simple Pricing</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>

            <div style={{ background: "#0b0b0e", border: "1px solid #111115", borderRadius: 18, padding: "32px 28px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#27272a", letterSpacing: "2px", marginBottom: 20 }}>FREE FOREVER</div>
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-2px", marginBottom: 4 }}>0 <span style={{ fontSize: 16, fontWeight: 400, color: "#3f3f46" }}>SOL</span></div>
              <div style={{ fontSize: 10, color: "#27272a", marginBottom: 28 }}>No credit card · no signup</div>
              <div style={{ height: 1, background: "#111115", marginBottom: 24 }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, fontSize: 11, color: "#52525b" }}>
                    <span style={{ color: "#10b981", flexShrink: 0, fontWeight: 700 }}>↗</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={handleConnect} disabled={connecting}
                style={{ width: "100%", padding: "11px", borderRadius: 9, border: "1px solid #1e1e24", background: "transparent", color: "#71717a", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: ".3px" }}>
                {connecting ? "Connecting…" : "Start Free →"}
              </button>
            </div>

            <div style={{ background: "#0b0b0f", border: "1px solid #2d1f4a", borderRadius: 18, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #dc2626, #7c3aed, #dc2626)" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, #7c3aed0a 0%, transparent 60%)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#a855f7", letterSpacing: "2px" }}>GEASS PRO</div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "#10b98118", border: "1px solid #10b98130", padding: "2px 8px", borderRadius: 6 }}>LIVE</span>
                </div>
                <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-2px", marginBottom: 4 }}>3 <span style={{ fontSize: 16, fontWeight: 400, color: "#52525b" }}>SOL<span style={{ fontSize: 11, color: "#3f3f46" }}>/mo</span></span></div>
                <div style={{ fontSize: 10, color: "#3f3f46", marginBottom: 28 }}>On-chain · paid in SOL</div>
                <div style={{ height: 1, background: "#1a1228", marginBottom: 24 }} />
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                  {["Everything in Free", "Insider & Rug Detector", "Dedicated RPC + Helius Priority", "Custom AI Rules & Sniping Bots", "Portfolio Analytics + Risk Tools", "Early access to new features"].map(f => (
                    <li key={f} style={{ display: "flex", gap: 10, fontSize: 11, color: "#c4b5fd" }}>
                      <span style={{ color: "#a855f7", flexShrink: 0, fontWeight: 700 }}>↗</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={handleConnect} disabled={connecting}
                  style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #dc2626, #7c3aed)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: connecting ? "wait" : "pointer", letterSpacing: ".3px", boxShadow: "0 0 24px #dc262630" }}>
                  {connecting ? "Connecting…" : "Connect & Upgrade →"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "0 32px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, #dc262614 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", background: "#0b0b0e", border: "1px solid #1a1a20", borderRadius: 24, padding: "56px 40px" }}>
            <div style={{ marginBottom: 20 }}><GeassLogo size={48} /></div>
            <h2 style={{ fontSize: "clamp(20px,4vw,28px)", fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 12 }}>Ready to see the alpha?</h2>
            <p style={{ fontSize: 12, color: "#3f3f46", lineHeight: 1.7, marginBottom: 32, maxWidth: 340, margin: "0 auto 32px" }}>
              Connect your Phantom wallet and enter GEASS in 5 seconds. No registration. No email. Just on-chain.
            </p>
            <button onClick={handleConnect} disabled={connecting}
              style={{ padding: "14px 40px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #dc2626, #7c3aed)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: connecting ? "wait" : "pointer", boxShadow: "0 0 60px #dc262630", display: "inline-flex", alignItems: "center", gap: 10, letterSpacing: ".3px" }}>
              {connecting ? "Connecting…" : <><IconSolana size={15} /> Connect Phantom</>}
            </button>
            {connectError && <div style={{ marginTop: 12, fontSize: 11, color: "#ef4444" }}>{connectError}</div>}
            <p style={{ marginTop: 16, fontSize: 10, color: "#1e1e24" }}>Free · No KYC · Solana mainnet</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #0f0f12", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GeassLogo size={14} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1.5px", color: "#27272a" }}>GEASS</span>
          <span style={{ fontSize: 10, color: "#1e1e24" }}>· Alpha Recon · Solana</span>
        </div>
        <div style={{ fontSize: 10, color: "#1e1e24", maxWidth: 360, textAlign: "right" }}>
          Trading crypto carries risk. GEASS signals are informational only — not financial advice.
        </div>
      </footer>

    </div>
  );
}
