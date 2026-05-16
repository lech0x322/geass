"use client";

import { useState } from "react";
import { GeassLogo } from "./GeassLogo";
import {
  IconScanner, IconActivity, IconRocket, IconSparkle,
  IconShield, IconZap, IconCpu, IconChart,
  IconArrowRight, IconCheck, IconWallet,
} from "./icons";

interface Props {
  onConnect: () => Promise<void>;
  connecting: boolean;
}

const CORE_FEATURES = [
  { Icon: IconActivity, label: "Realtime Trades", tag: "FREE", desc: "Live feed of every buy and sell from tracked high-performing wallets, the moment it lands on-chain. Inspired by the kolscan trade ticker.",   color: "#3b82f6" },
  { Icon: IconChart,    label: "Token Tracker",   tag: "FREE", desc: "Which tokens are KOLs accumulating right now? Trending tickers with active-wallet counts, recent volume, and last-trade timestamps.",     color: "#10b981" },
  { Icon: IconRocket,   label: "Token Launch",    tag: "FREE", desc: "Create and deploy tokens directly on Pump.fun in under 60 seconds. End-to-end on-chain via Phantom — no third-party middleman.",         color: "#a855f7" },
];

const PRO_FEATURES = [
  { Icon: IconScanner, title: "Alpha Scanner",                  desc: "Real-time detection of high-potential Solana tokens. Scored across 20+ on-chain signals via Helius and DexScreener — before they hit the charts." },
  { Icon: IconShield,  title: "Insider & Rug Detector",         desc: "Advanced on-chain analysis identifies insider wallets, coordinated buys, and rug patterns before they hit Twitter." },
  { Icon: IconZap,     title: "Dedicated RPC & Priority",       desc: "Skip the queue. Requests route through dedicated Helius nodes — first to detect, first to execute." },
  { Icon: IconCpu,     title: "Custom AI Rules & Bots",         desc: "Define your own entry conditions. Automate buys based on score, KOL activity, or bonding-curve progress." },
  { Icon: IconChart,   title: "Portfolio Analytics & Risk",     desc: "Real-time P&L, exposure by tier, drawdown alerts, and AI-generated risk scores per position." },
];

const FREE_FEATURES = [
  "Realtime Trades — live KOL transactions",
  "Token Tracker — coins KOLs are buying",
  "Token Launch on Pump.fun",
  "Wallet sign-in with Phantom",
  "Mobile-first dashboard",
];

const PRO_BENEFITS = [
  "Everything in Free",
  "Alpha Scanner — early high-potential detection",
  "Insider & Rug Detector",
  "Dedicated RPC and priority indexing",
  "Custom AI rules and sniping bots",
  "Portfolio analytics and risk tools",
];

const STATS = [
  { v: "48ms",  l: "Avg detection latency" },
  { v: "3.2k+", l: "Tokens scanned per day" },
  { v: "94%",   l: "Signal accuracy (30d)" },
  { v: "12x",   l: "Avg multiple on S-tier" },
];

const ACCENT = "#ef4444";
const ACCENT_2 = "#8b5cf6";
const SURFACE = "#0c0c0e";
const BORDER = "#1c1c1f";
const TEXT = "#fafafa";
const MUTED = "#a1a1aa";
const SUBTLE = "#52525b";
const FAINT = "#3f3f46";

export function LandingPage({ onConnect, connecting }: Props) {
  const [err, setErr] = useState("");

  const handleConnect = async () => {
    setErr("");
    try { await onConnect(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Connection failed"); }
  };

  return (
    <div style={{ background: "#09090b", color: TEXT, fontFamily: "'Inter',ui-sans-serif,system-ui,sans-serif", minHeight: "100vh", overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>

      {/* Top Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(9,9,11,.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid ${BORDER}`, height: 60 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", height: "100%", display: "flex", alignItems: "center", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <GeassLogo size={26} />
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "2px" }}>GEASS</span>
            <span style={{ fontSize: 9, color: FAINT, letterSpacing: "2.5px", marginLeft: 4 }}>ALPHA RECON</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <a href="#features" style={navLinkStyle}>Features</a>
            <a href="#pro"      style={navLinkStyle}>Pro</a>
            <a href="#pricing"  style={navLinkStyle}>Pricing</a>
            <button onClick={handleConnect} disabled={connecting} style={{ ...primaryGhost, marginLeft: 8 }}>
              {connecting ? "Connecting…" : "Enter"}
              <IconArrowRight size={12} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", padding: "96px 24px 72px" }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 100% 60% at 50% -20%, ${ACCENT}1f 0%, transparent 65%), radial-gradient(ellipse 60% 50% at 70% 30%, ${ACCENT_2}14 0%, transparent 70%)`,
        }} />
        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 999, padding: "5px 14px", fontSize: 10, color: "#10b981", fontWeight: 600, marginBottom: 28, letterSpacing: "1.5px" }}>
            <span className="live-dot" style={{ background: "#10b981" }} />
            LIVE ON SOLANA MAINNET
          </div>
          <h1 style={{ fontSize: "clamp(38px,6.5vw,68px)", fontWeight: 800, lineHeight: 1.05, marginBottom: 22, letterSpacing: "-1.5px" }}>
            The alpha intelligence
            <br />
            <span style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              layer for Solana.
            </span>
          </h1>
          <p style={{ fontSize: "clamp(14px,1.6vw,17px)", color: MUTED, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.65 }}>
            GEASS surfaces high-potential tokens in real time using on-chain signals, KOL wallet tracking, and AI-driven scoring — before they ever reach a chart.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleConnect} disabled={connecting} style={primaryButton}>
              <IconWallet size={14} />
              {connecting ? "Connecting wallet…" : "Connect Phantom"}
            </button>
            <a href="#features" style={secondaryButton}>
              See how it works
              <IconArrowRight size={12} />
            </a>
          </div>
          {err && <div style={{ marginTop: 14, fontSize: 12, color: ACCENT }}>{err}</div>}
          <p style={{ marginTop: 18, fontSize: 11, color: FAINT }}>No signup. No credit card. Sign once with your wallet — that&apos;s it.</p>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          {STATS.map(s => (
            <div key={s.l} style={{ background: SURFACE, padding: "26px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: TEXT, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: SUBTLE, marginTop: 6, letterSpacing: "1px", textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section id="features" style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <SectionHeader eyebrow="Platform" title="Built for traders, not tourists." subtitle="Every Solana signal you need — free, in one workspace." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {CORE_FEATURES.map(f => (
              <div key={f.label} style={cardStyle}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at top, ${f.color}10, transparent 60%)`, pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${f.color}14`, border: `1px solid ${f.color}33`, color: f.color }}>
                      <f.Icon size={18} strokeWidth={1.7} />
                    </div>
                    <span style={tagStyle(f.color)}>{f.tag}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: "-.2px" }}>{f.label}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro */}
      <section id="pro" style={{ padding: "0 24px 96px", background: "linear-gradient(180deg, transparent, rgba(139,92,246,.04), transparent)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <SectionHeader
            eyebrow={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconSparkle size={11} strokeWidth={1.8} />GEASS PRO</span>}
            title="Intelligence, protection, and automation."
            subtitle="For traders who can&apos;t afford to miss the move."
            tone="pro"
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {PRO_FEATURES.map(f => (
              <div key={f.title} style={{ ...cardStyle, background: "linear-gradient(180deg, #11101a, #0d0c14)", borderColor: "rgba(139,92,246,.18)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${ACCENT_2}16`, border: `1px solid ${ACCENT_2}38`, color: "#c4b5fd", marginBottom: 16 }}>
                  <f.Icon size={18} strokeWidth={1.7} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e9e4f8", marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <SectionHeader eyebrow="Pricing" title="Two tiers. No middle-ground gimmicks." subtitle="Free is fully functional. Pro is for serious operators." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
            {/* Free */}
            <div style={{ ...pricingCard }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: SUBTLE, letterSpacing: "2px", marginBottom: 14 }}>FREE</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-1.5px", fontVariantNumeric: "tabular-nums" }}>0</div>
                <div style={{ fontSize: 14, color: SUBTLE, fontWeight: 500 }}>SOL</div>
              </div>
              <div style={{ fontSize: 12, color: SUBTLE, marginBottom: 28 }}>Forever. No card required.</div>
              <ul style={listReset}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={liStyle}>
                    <IconCheck size={14} strokeWidth={2} style={{ color: "#10b981" }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={handleConnect} disabled={connecting} style={{ ...secondaryButton, width: "100%", marginTop: 28, justifyContent: "center" }}>
                {connecting ? "Connecting…" : "Get started free"}
                <IconArrowRight size={12} />
              </button>
            </div>
            {/* Pro */}
            <div style={{ ...pricingCard, background: "linear-gradient(180deg, #11101a, #0d0c14)", borderColor: "rgba(139,92,246,.32)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})` }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: ACCENT_2, letterSpacing: "2px", marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconSparkle size={12} strokeWidth={2} /> GEASS PRO
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-1.5px", fontVariantNumeric: "tabular-nums" }}>3</div>
                <div style={{ fontSize: 14, color: SUBTLE, fontWeight: 500 }}>SOL / month</div>
              </div>
              <div style={{ fontSize: 12, color: SUBTLE, marginBottom: 28 }}>On-chain payment. Instant activation.</div>
              <ul style={listReset}>
                {PRO_BENEFITS.map(f => (
                  <li key={f} style={liStyle}>
                    <IconCheck size={14} strokeWidth={2} style={{ color: ACCENT_2 }} />
                    <span style={{ color: "#e9e4f8" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={handleConnect} disabled={connecting} style={{ ...primaryButton, width: "100%", marginTop: 28, justifyContent: "center" }}>
                <IconWallet size={14} />
                {connecting ? "Connecting…" : "Connect and upgrade"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 32px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${ACCENT}12, transparent 60%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-flex", marginBottom: 18 }}><GeassLogo size={40} /></div>
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10, letterSpacing: "-.5px" }}>Ready to see the alpha?</h2>
            <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 30, lineHeight: 1.65 }}>
              Sign in with Phantom. You&apos;re in the workspace in five seconds — free.
            </p>
            <button onClick={handleConnect} disabled={connecting} style={primaryButton}>
              <IconWallet size={14} />
              {connecting ? "Connecting…" : "Connect Phantom"}
            </button>
            {err && <div style={{ marginTop: 14, fontSize: 12, color: ACCENT }}>{err}</div>}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "28px 24px", color: FAINT }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GeassLogo size={18} />
            <span style={{ fontWeight: 700, letterSpacing: "1.5px", fontSize: 11, color: SUBTLE }}>GEASS</span>
            <span style={{ fontSize: 10 }}>— Alpha Recon · Solana</span>
          </div>
          <div style={{ fontSize: 10, color: FAINT, maxWidth: 480, lineHeight: 1.6, textAlign: "right" }}>
            Trading crypto carries risk. GEASS signals are informational only — not financial advice.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── helpers / shared styles ────────────────────────────────────────

function SectionHeader({ eyebrow, title, subtitle, tone }: { eyebrow: React.ReactNode; title: string; subtitle: string; tone?: "default" | "pro" }) {
  const eyebrowColor = tone === "pro" ? "#a78bfa" : "#a1a1aa";
  return (
    <div style={{ textAlign: "center", marginBottom: 48 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: eyebrowColor, letterSpacing: "2.5px", marginBottom: 12, textTransform: "uppercase" }}>{eyebrow}</div>
      <h2 style={{ fontSize: "clamp(24px,3.5vw,34px)", fontWeight: 700, marginBottom: 12, letterSpacing: "-.8px", lineHeight: 1.15 }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: "#71717a", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#a1a1aa",
  textDecoration: "none",
  padding: "6px 12px",
  borderRadius: 6,
  fontWeight: 500,
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 22px",
  borderRadius: 10,
  border: "none",
  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: ".2px",
  cursor: "pointer",
  boxShadow: `0 1px 0 0 rgba(255,255,255,.08) inset, 0 8px 24px -8px ${ACCENT}66`,
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  color: TEXT,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
};

const primaryGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 8,
  border: `1px solid ${ACCENT}33`,
  background: `${ACCENT}10`,
  color: "#fca5a5",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".5px",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: "24px 22px",
  position: "relative",
  overflow: "hidden",
};

const pricingCard: React.CSSProperties = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
  padding: "32px 28px",
};

const listReset: React.CSSProperties = { listStyle: "none", display: "flex", flexDirection: "column", gap: 11 };

const liStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: MUTED };

function tagStyle(color: string): React.CSSProperties {
  return {
    fontSize: 9,
    fontWeight: 700,
    color,
    background: color + "14",
    border: `1px solid ${color}38`,
    padding: "3px 8px",
    borderRadius: 999,
    letterSpacing: "1px",
  };
}
