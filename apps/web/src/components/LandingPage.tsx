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

/** Login modal — Phantom / Telegram OTP / X */
function LoginModal({
  onClose,
  onConnect,
  connecting,
}: {
  onClose: () => void;
  onConnect: () => Promise<void>;
  connecting: boolean;
}) {
  const [tgStep, setTgStep]   = useState<"idle" | "waiting" | "done">("idle");
  const [tgCode, setTgCode]   = useState("");
  const [tgError, setTgError] = useState("");
  const [phantomErr, setPhantomErr] = useState("");
  const tgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (tgPollRef.current) clearInterval(tgPollRef.current); };
  }, []);

  const handlePhantom = async () => {
    setPhantomErr("");
    try {
      await onConnect();
      onClose();
    } catch (e) {
      setPhantomErr(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const handleTelegramLogin = async () => {
    setTgError("");
    try {
      const r = await fetch("/api/auth/telegram/init", { method: "POST" });
      if (!r.ok) { setTgError("Could not generate code. Try again."); return; }
      const { code } = await r.json() as { code: string };
      setTgCode(code);
      setTgStep("waiting");

      tgPollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/auth/telegram/poll?code=${code}`);
          const data = await pr.json() as { verified: boolean; error?: string };
          if (data.verified) {
            clearInterval(tgPollRef.current!);
            setTgStep("done");
            setTimeout(() => window.location.reload(), 800);
          }
          if (data.error === "Code expired") {
            clearInterval(tgPollRef.current!);
            setTgStep("idle");
            setTgError("Code expired. Try again.");
          }
        } catch { /* network hiccup — keep polling */ }
      }, 2000);

      setTimeout(() => {
        if (tgPollRef.current) {
          clearInterval(tgPollRef.current);
          setTgStep("idle");
          setTgError("Timed out — try again.");
        }
      }, 300_000);
    } catch {
      setTgError("Connection error. Try again.");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 200, backdropFilter: "blur(4px)" }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 201, width: "min(400px, 92vw)",
        background: "#0e0e12", border: "1px solid #1e1e26", borderRadius: 18,
        boxShadow: "0 32px 80px #00000090, 0 0 0 1px #ffffff06 inset",
        overflow: "hidden",
      }}>
        {/* Top accent line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, #dc2626, #7c3aed, #dc2626)" }} />

        <div style={{ padding: "28px 28px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <GeassLogo size={22} />
              <div>
                <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: "1.5px" }}>GEASS</div>
                <div style={{ fontSize: 9, color: "#3f3f46", letterSpacing: "1px" }}>ALPHA RECON</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px" }}>×</button>
          </div>

          {tgStep === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>Choose how to enter</div>

              {/* Phantom — primary */}
              <button onClick={handlePhantom} disabled={connecting}
                style={{
                  width: "100%", padding: "13px 18px", borderRadius: 11, border: "none",
                  background: "linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)",
                  color: "#fff", fontSize: 13, fontWeight: 800, cursor: connecting ? "wait" : "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  boxShadow: "0 0 32px #dc262630",
                }}>
                <IconSolana size={16} />
                {connecting ? "Connecting…" : "Connect Phantom"}
                <span style={{ marginLeft: "auto", fontSize: 10, opacity: .6, fontWeight: 500 }}>Solana wallet</span>
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#1a1a22" }} />
                <span style={{ fontSize: 10, color: "#3f3f46" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#1a1a22" }} />
              </div>

              {/* Telegram */}
              <button onClick={handleTelegramLogin}
                style={{
                  width: "100%", padding: "12px 18px", borderRadius: 11,
                  border: "1px solid #2291d038", background: "#2291d010",
                  color: "#38bdf8", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                <span style={{ fontSize: 17 }}>✈</span>
                Login with Telegram
                <span style={{ marginLeft: "auto", fontSize: 10, opacity: .5, fontWeight: 500 }}>@geasstrade_bot</span>
              </button>

              {/* X / Twitter */}
              <a href="/api/auth/twitter"
                style={{
                  width: "100%", padding: "12px 18px", borderRadius: 11,
                  border: "1px solid #ffffff14", background: "#ffffff07",
                  color: "#e2e8f0", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
                  boxSizing: "border-box",
                }}>
                <span style={{ fontSize: 14, fontWeight: 900 }}>𝕏</span>
                Login with X
                <span style={{ marginLeft: "auto", fontSize: 10, opacity: .5, fontWeight: 500 }}>Twitter account</span>
              </a>

              {phantomErr && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{phantomErr}</div>}
              {tgError    && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{tgError}</div>}

              <div style={{ marginTop: 8, fontSize: 10, color: "#27272a", textAlign: "center", lineHeight: 1.6 }}>
                Non-custodial · No registration · Free to start
              </div>
            </div>
          )}

          {tgStep === "waiting" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 12 }}>
                Open <span style={{ color: "#38bdf8", fontWeight: 700 }}>@geasstrade_bot</span> on Telegram and send this code:
              </div>
              <div style={{
                fontSize: 32, fontWeight: 800, letterSpacing: 8, color: "#f4f4f5",
                fontFamily: "ui-monospace,monospace", margin: "12px 0",
                background: "#0c1a24", border: "1px solid #2291d028", borderRadius: 10, padding: "14px 0",
              }}>{tgCode}</div>
              <div style={{ fontSize: 10, color: "#52525b", marginBottom: 16 }}>Verifying automatically once you send it…</div>
              <button onClick={() => { if (tgPollRef.current) clearInterval(tgPollRef.current); setTgStep("idle"); setTgCode(""); }}
                style={{ fontSize: 11, color: "#52525b", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Cancel
              </button>
            </div>
          )}

          {tgStep === "done" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
              <div style={{ fontSize: 13, color: "#10b981", fontWeight: 700 }}>Authenticated — loading…</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function LandingPage({ onConnect, connecting }: Props) {
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Surface Twitter/X OAuth errors from callback redirect (?login_error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("login_error");
    if (err) {
      setLoginError(decodeURIComponent(err));
      setShowLogin(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const openLogin = () => { setLoginError(""); setShowLogin(true); };

  return (
    <div style={{ background: "#07070a", color: "#f4f4f5", fontFamily: "'Inter',system-ui,sans-serif", minHeight: "100vh", overflowX: "hidden" }}>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onConnect={onConnect}
          connecting={connecting}
        />
      )}

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#07070acc", backdropFilter: "blur(16px)", borderBottom: "1px solid #111115", display: "flex", alignItems: "center", padding: "0 32px", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <GeassLogo size={24} />
          <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: "2px" }}>GEASS</span>
          <span style={{ fontSize: 7, color: "#27272a", letterSpacing: "3px", marginLeft: 4, paddingTop: 1 }}>ALPHA RECON</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <a href="#features" style={{ fontSize: 11, color: "#3f3f46", textDecoration: "none", letterSpacing: ".3px" }}>Features</a>
          <a href="#how"      style={{ fontSize: 11, color: "#3f3f46", textDecoration: "none", letterSpacing: ".3px" }}>How it works</a>
          <a href="#pricing"  style={{ fontSize: 11, color: "#3f3f46", textDecoration: "none", letterSpacing: ".3px" }}>Pricing</a>
          <button onClick={openLogin}
            style={{ padding: "6px 18px", borderRadius: 7, border: "1px solid #dc262650", background: "#dc26260e", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: ".5px" }}>
            Enter App →
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
          <button onClick={openLogin}
            style={{ padding: "14px 40px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: ".3px", boxShadow: "0 0 48px #dc262638, 0 2px 0 #0004 inset" }}>
            Enter GEASS →
          </button>
          <a href="#features"
            style={{ padding: "14px 24px", borderRadius: 10, border: "1px solid #1e1e24", background: "transparent", color: "#71717a", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            See features ↓
          </a>
        </div>

        {loginError && (
          <div style={{ marginTop: 16, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{loginError}</div>
        )}

        <p style={{ marginTop: 16, fontSize: 10, color: "#27272a", letterSpacing: ".3px" }}>
          Phantom · Telegram · X — free to start · no registration
        </p>

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

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 9, color: "#3f3f46", letterSpacing: "2px", fontWeight: 700, marginBottom: 12 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 10 }}>From mint to position in seconds</h2>
            <p style={{ fontSize: 12, color: "#3f3f46", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              GEASS combines four real-time data layers into one cohesive signal — so you act on conviction, not noise.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {[
              { step: "01", title: "Detect", color: "#ef4444", desc: "Helius WebSocket pushes every new token mint on Solana within ~48ms of the on-chain event." },
              { step: "02", title: "Enrich", color: "#f59e0b", desc: "Bonding curve progress, holder count, mint/freeze authority, liquidity — pulled in parallel and cached." },
              { step: "03", title: "Score",  color: "#3b82f6", desc: "20+ signals run through GEASS scoring engine. Tier badge (S/A/B/C/Rug) computed in <100ms." },
              { step: "04", title: "Act",    color: "#10b981", desc: "One-click trade via Phantom or auto-snipe with Jito bundle for MEV protection. Stay in front." },
            ].map(s => (
              <div key={s.step} style={{ background: "#0a0a0d", border: "1px solid #111115", borderRadius: 14, padding: "24px 22px", position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 18, fontSize: 28, fontWeight: 900, color: s.color + "30", letterSpacing: "-1px" }}>{s.step}</div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 12px ${s.color}`, marginBottom: 18 }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: "#e4e4e7", marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#3f3f46", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: "0 32px 80px" }}>
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

      {/* TECH STACK */}
      <section style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 9, color: "#3f3f46", letterSpacing: "2px", fontWeight: 700, marginBottom: 12 }}>BUILT ON</div>
            <h2 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 10 }}>Best-in-class infrastructure</h2>
            <p style={{ fontSize: 12, color: "#3f3f46", maxWidth: 480, margin: "0 auto" }}>No shortcuts. Every dependency picked for speed, reliability, and on-chain transparency.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {[
              { name: "Helius",       desc: "Real-time WebSocket + Enhanced Transactions API for sub-50ms detection." },
              { name: "Jito",         desc: "MEV-protected bundles for sniping. Anti-front-running on every launch." },
              { name: "Pump.fun",     desc: "Native bonding curve integration. Launch and trade in one tab." },
              { name: "DEX Screener", desc: "Live price + liquidity feeds across every Solana DEX." },
              { name: "Phantom",      desc: "Non-custodial wallet. GEASS never sees your private keys." },
              { name: "1inch",        desc: "Cross-chain swaps via Fusion+. Bridge in and out of Solana seamlessly." },
              { name: "Upstash",      desc: "Edge-cached Redis. KOL feed and session state with zero cold-start." },
              { name: "Next.js 15",   desc: "Turbopack monorepo. Server-side streaming for instant TTFB." },
            ].map(t => (
              <div key={t.name} style={{ background: "#0a0a0d", border: "1px solid #111115", borderRadius: 12, padding: "18px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7", marginBottom: 6, letterSpacing: ".3px" }}>{t.name}</div>
                <div style={{ fontSize: 10, color: "#3f3f46", lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY GEASS */}
      <section style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 9, color: "#3f3f46", letterSpacing: "2px", fontWeight: 700, marginBottom: 12 }}>WHY GEASS</div>
            <h2 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 10 }}>Built for traders, not tourists</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
            {[
              { title: "100% non-custodial",  desc: "No deposits, no escrow. Every signature happens in your wallet. GEASS cannot move your funds — ever." },
              { title: "On-chain transparency", desc: "All Pro subscriptions paid in SOL on Solana mainnet. Treasury wallet is public. Track every fee on-chain." },
              { title: "No paywalled signals",  desc: "Free tier shows the same Alpha Scanner data as Pro. Pro adds automation, not access to information." },
              { title: "Sub-50ms detection",   desc: "Most platforms use polling. GEASS uses Helius WebSocket push — you see new mints before they hit Twitter." },
              { title: "MEV protection by default", desc: "Auto-snipe routes through Jito bundles. No sandwich attacks, no front-running by bots." },
              { title: "Solana-native, multi-chain ready", desc: "Optimized for Solana speed. 1inch integration unlocks EVM swaps for cross-chain portfolio rotation." },
            ].map(b => (
              <div key={b.title} style={{ background: "#0a0a0d", border: "1px solid #111115", borderRadius: 12, padding: "20px 18px", display: "flex", gap: 14 }}>
                <div style={{ flexShrink: 0, width: 6, alignSelf: "stretch", background: "linear-gradient(180deg, #dc2626, #7c3aed)", borderRadius: 3 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7", marginBottom: 6 }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: "#3f3f46", lineHeight: 1.7 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 9, color: "#3f3f46", letterSpacing: "2px", fontWeight: 700, marginBottom: 12 }}>QUESTIONS</div>
            <h2 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, letterSpacing: "-1px" }}>Frequently asked</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { q: "Is GEASS safe? Do you have my private keys?",
                a: "No. GEASS is fully non-custodial. Every transaction is signed in your Phantom wallet. We never see, store, or transmit your private keys. Signatures use Sign-In With Solana (SIWS) — an industry standard that proves wallet ownership without granting any permissions." },
              { q: "What does the Free tier actually include?",
                a: "Everything the Alpha Scanner offers: real-time token detection, scoring, KOL feed, tier badges, and Pump.fun token launching. No credit card, no email signup. Just connect Phantom." },
              { q: "How does Pro differ from Free?",
                a: "Pro unlocks automation (auto-snipe bots, custom AI rules), dedicated Helius RPC for priority routing, the Insider/Rug Detector, portfolio analytics with AI risk scoring, and early access to new features. Pro does not gate information — it adds execution speed." },
              { q: "How is Pro paid for?",
                a: "3 SOL per month, paid directly on-chain via Phantom. The transaction is verified by a Helius webhook and your Pro status is activated within seconds. Cancel anytime — just stop paying. No subscriptions, no recurring auth." },
              { q: "Why Solana?",
                a: "Speed and cost. New tokens launch every minute on Pump.fun. Solana's sub-second finality + millicent fees mean GEASS can react in real-time without paying gas fees on every signal. 1inch integration extends reach to EVM chains when needed." },
              { q: "What about MEV / sandwich attacks?",
                a: "GEASS auto-snipe routes through Jito bundles. Your transaction is included in a private bundle that bots cannot front-run. For manual trades, you can still opt-in to Jito tipping at submit time." },
              { q: "Can I log in without a Phantom wallet?",
                a: "Yes. Click 'Enter GEASS' and choose Telegram or X (Twitter). For Telegram, send a one-time code to @geasstrade_bot — no wallet needed. For X, a standard OAuth flow logs you in through your Twitter account." },
              { q: "Can I run GEASS on mobile?",
                a: "Yes. The web app is fully mobile-responsive. On mobile, Connect Phantom opens the Phantom mobile app via deep link, signs there, and returns to GEASS. You can also log in via Telegram or X without any wallet app." },
            ].map((f, i) => (
              <details key={i} style={{ background: "#0a0a0d", border: "1px solid #111115", borderRadius: 12, padding: "16px 20px", cursor: "pointer" }}>
                <summary style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span>{f.q}</span>
                  <span style={{ color: "#3f3f46", fontSize: 14, fontWeight: 400, flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ marginTop: 12, fontSize: 11, color: "#71717a", lineHeight: 1.75 }}>{f.a}</div>
              </details>
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
              <button onClick={openLogin}
                style={{ width: "100%", padding: "11px", borderRadius: 9, border: "1px solid #1e1e24", background: "transparent", color: "#71717a", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: ".3px" }}>
                Start Free →
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
                <button onClick={openLogin}
                  style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #dc2626, #7c3aed)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: ".3px", boxShadow: "0 0 24px #dc262630" }}>
                  Enter & Upgrade →
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
              Enter GEASS in seconds — Phantom, Telegram, or X. No registration. No email. Just on-chain.
            </p>
            <button onClick={openLogin}
              style={{ padding: "14px 40px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #dc2626, #7c3aed)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 0 60px #dc262630", letterSpacing: ".3px" }}>
              Enter GEASS →
            </button>
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
