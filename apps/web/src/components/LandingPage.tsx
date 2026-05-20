"use client";

import type { FC } from "react";
import { useState, useRef } from "react";
import { GeassLogo } from "./GeassLogo";
import {
  IconSearch, IconZap, IconTarget, IconChart,
  IconSparkle, IconBroadcast, IconRocket, IconCrown, IconSolana,
} from "./icons";

interface Props {
  onConnect: () => Promise<void>;
  connecting: boolean;
}

const PRO_FEATURES: { Icon: FC<{ size?: number }>; title: string; desc: string }[] = [
  { Icon: IconSearch, title: "Insider & Rug Detector",         desc: "Advanced on-chain analysis detects insider wallets, coordinated buys and rug patterns before they hit Twitter." },
  { Icon: IconZap,    title: "Dedicated RPC + Helius Priority", desc: "Skip the queue. Your requests go through dedicated Helius nodes — first to detect, first to snipe." },
  { Icon: IconTarget, title: "Custom AI Rules & Sniping Bots", desc: "Define your own entry conditions. Automate buys based on score, KOL activity, bonding curve progress." },
  { Icon: IconChart,  title: "Portfolio Analytics + Risk Tools", desc: "Real-time P&L, exposure by tier, drawdown alerts, and AI-generated risk scores per position." },
];

const FREE_FEATURES = [
  "Alpha Scanner — live token detection",
  "Live KOL Feed — track whale wallets",
  "Token Launch on Pump.fun",
  "Score filtering & tier badges",
  "SSE real-time stream",
];

const STATS = [
  { v: "48ms", l: "Avg detection latency" },
  { v: "3.2k+", l: "Tokens scanned / day" },
  { v: "94%", l: "Signal accuracy (30d)" },
  { v: "12x", l: "Avg x on S-Tier picks" },
];

export function LandingPage({ onConnect, connecting }: Props) {
  const [connectError, setConnectError] = useState("");
  const [connectHint, setConnectHint] = useState("");
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleConnect = async () => {
    setConnectError("");
    setConnectHint("");
    if (hintTimer.current) clearTimeout(hintTimer.current);
    // After 2 s still connecting, prompt user to check the Phantom popup
    hintTimer.current = setTimeout(() => setConnectHint("Open your Phantom extension — it's waiting for approval"), 2000);
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
    <div style={{ background: "#09090b", color: "#f4f4f5", fontFamily: "'Inter',system-ui,sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#09090bcc", backdropFilter: "blur(12px)", borderBottom: "1px solid #18181b", display: "flex", alignItems: "center", padding: "0 24px", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <GeassLogo size={26} />
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "1.5px" }}>GEASS</span>
          <span style={{ fontSize: 8, color: "#3f3f46", letterSpacing: "2px", marginLeft: 2 }}>ALPHA RECON</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="#pricing" style={{ fontSize: 11, color: "#52525b", textDecoration: "none", padding: "4px 8px" }}>Pricing</a>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <button onClick={handleConnect} disabled={connecting}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #dc262640", background: "#dc262612", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: connecting ? "wait" : "pointer", letterSpacing: ".5px" }}>
              {connecting ? "Connecting..." : "Enter GEASS →"}
            </button>
            {connectError && <div style={{ fontSize: 9, color: "#ef4444", maxWidth: 180, textAlign: "right" }}>{connectError}</div>}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -10%, #dc262618 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#10b98112", border: "1px solid #10b98130", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#10b981", fontWeight: 600, marginBottom: 24, letterSpacing: "1px" }}>
          <span className="live-dot" style={{ background: "#10b981" }} /> LIVE · SOLANA MAINNET
        </div>
        <h1 style={{ fontSize: "clamp(32px,6vw,64px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-1px" }}>
          The Alpha Intelligence<br />
          <span style={{ background: "linear-gradient(135deg,#dc2626,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Layer for Solana
          </span>
        </h1>
        <p style={{ fontSize: "clamp(13px,2vw,17px)", color: "#71717a", maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.6 }}>
          GEASS detects high-potential tokens in real-time using on-chain signals, KOL wallet tracking, and AI-powered scoring — before they hit the charts.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleConnect} disabled={connecting}
            style={{ padding: "13px 32px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: connecting ? "wait" : "pointer", letterSpacing: ".5px", boxShadow: "0 0 32px #dc262640", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {connecting ? "Connecting wallet..." : <><IconSolana size={14} /> Connect Phantom — Enter GEASS</>}
          </button>
        </div>
        {connectHint && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>{connectHint}</div>
        )}
        {connectError && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>{connectError}</div>
        )}
        <p style={{ marginTop: 12, fontSize: 10, color: "#3f3f46" }}>No registration needed · Sign with your Phantom wallet · Free to start</p>
      </section>

      {/* Stats */}
      <section style={{ padding: "0 24px 64px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {STATS.map(s => (
            <div key={s.l} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444", letterSpacing: "-1px" }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "#52525b", marginTop: 4, letterSpacing: ".5px" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Core Features</h2>
          <p style={{ textAlign: "center", fontSize: 12, color: "#52525b", marginBottom: 40 }}>Everything in the Free tier — no credit card, no signup</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
            {([
              { Icon: IconSparkle,   label: "Alpha Scanner", desc: "Real-time detection of Solana tokens with growth potential. Scored by 20+ on-chain signals via Helius + DexScreener.", badge: "FREE", bc: "#10b981" },
              { Icon: IconBroadcast, label: "Live KOL Feed", desc: "Watch exactly what high-performing wallets are buying and selling, the moment it happens on-chain.", badge: "FREE", bc: "#3b82f6" },
              { Icon: IconRocket,    label: "Token Launch",  desc: "Create and deploy tokens directly on Pump.fun in under 60 seconds. 100% on-chain via Phantom.", badge: "FREE", bc: "#a855f7" },
            ] as { Icon: FC<{ size?: number }>; label: string; desc: string; badge: string; bc: string }[]).map(f => (
              <div key={f.label} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: 2, background: `linear-gradient(90deg, transparent, ${f.bc}60, transparent)` }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <span style={{ color: f.bc, display: "inline-flex" }}><f.Icon size={28} /></span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: f.bc, background: f.bc + "18", border: `1px solid ${f.bc}40`, padding: "2px 8px", borderRadius: 8 }}>{f.badge}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "#71717a", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro */}
      <section style={{ padding: "0 24px 80px", background: "#0a0a0c" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", paddingTop: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 8 }}>
            <span style={{ color: "#eab308", display: "inline-flex" }}><IconCrown size={18} /></span>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>GEASS Pro</h2>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#10b981", background: "#10b98120", border: "1px solid #10b98140", padding: "3px 10px", borderRadius: 8 }}>LIVE · 3 SOL/MO</span>
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#52525b", marginBottom: 40 }}>Intelligence + protection + automation for serious traders</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
            {PRO_FEATURES.map(f => (
              <div key={f.title} style={{ background: "linear-gradient(135deg, #111113 0%, #14101f 100%)", border: "1px solid #7c3aed30", borderRadius: 14, padding: "20px 18px" }}>
                <div style={{ color: "#a855f7", marginBottom: 10 }}><f.Icon size={24} /></div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2d9f3", marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 10, color: "#71717a", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "64px 24px 80px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, marginBottom: 40 }}>Simple Pricing</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
            {/* Free */}
            <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 16, padding: "28px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#52525b", letterSpacing: "1px", marginBottom: 8 }}>FREE</div>
              <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>0 SOL</div>
              <div style={{ fontSize: 11, color: "#52525b", marginBottom: 24 }}>forever · no credit card</div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 11, color: "#a1a1aa" }}>
                    <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={handleConnect} disabled={connecting}
                style={{ marginTop: 28, width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#f4f4f5", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {connecting ? "Connecting..." : "Get Started Free →"}
              </button>
            </div>
            {/* Pro */}
            <div style={{ background: "linear-gradient(135deg, #14101f 0%, #111113 100%)", border: "1px solid #7c3aed50", borderRadius: 16, padding: "28px 24px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: 2, background: "linear-gradient(90deg,#dc2626,#7c3aed)" }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", letterSpacing: "1px", marginBottom: 8 }}>GEASS PRO</div>
              <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>3 SOL<span style={{ fontSize: 14, color: "#52525b", fontWeight: 400 }}>/mo</span></div>
              <div style={{ fontSize: 11, color: "#52525b", marginBottom: 24 }}>on-chain · paid in SOL</div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {["Everything in Free", "Insider & Rug Detector", "Dedicated RPC + Helius Priority", "Custom AI Rules & Sniping Bots", "Portfolio Analytics + Risk Tools", "Early access to new features"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 11, color: "#e2d9f3" }}>
                    <span style={{ color: "#a855f7", flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={handleConnect} disabled={connecting}
                style={{ marginTop: 28, width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: connecting ? "wait" : "pointer" }}>
                {connecting ? "Connecting..." : "Connect & Upgrade →"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 500, margin: "0 auto", background: "#111113", border: "1px solid #1e1e21", borderRadius: 20, padding: "40px 32px" }}>
          <GeassLogo size={40} />
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Ready to see the alpha?</h2>
          <p style={{ fontSize: 12, color: "#52525b", marginBottom: 28, lineHeight: 1.6 }}>Connect your Phantom wallet to enter GEASS. It takes 5 seconds.</p>
          <button onClick={handleConnect} disabled={connecting}
            style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: connecting ? "wait" : "pointer", boxShadow: "0 0 40px #dc262630", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {connecting ? "Connecting..." : <><IconSolana size={14} /> Connect Phantom</>}
          </button>
          {connectError && <div style={{ marginTop: 10, fontSize: 11, color: "#ef4444" }}>{connectError}</div>}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #18181b", padding: "24px", textAlign: "center", fontSize: 10, color: "#27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
          <GeassLogo size={16} />
          <span style={{ fontWeight: 700, letterSpacing: "1px" }}>GEASS</span>
          <span>· Alpha Recon Platform · Solana</span>
        </div>
        <div>Trading crypto carries risk. GEASS signals are informational only, not financial advice.</div>
      </footer>
    </div>
  );
}
