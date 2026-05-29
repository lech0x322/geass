"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Keypair, VersionedTransaction, Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { pumpTradeTx, pumpIpfs, jitoLaunchBundle, jitoSubmit } from "@/lib/api";
import { signAllWithPhantom, signAndSendBytes } from "@/lib/wallet";

const TREASURY = process.env.NEXT_PUBLIC_GEASS_WALLET_PUBKEY ?? "";
const RPC_URL  = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";

/* Paid growth-boost tiers — payment sent to the GEASS treasury after launch. */
const BOOST_TIERS = [
  {
    id: "trending", sol: 0.2, label: "Trending Boost", color: "#3b82f6",
    perks: [
      "Featured in GEASS Alpha Scanner for 6h",
      "Instant push to all watchlist users",
      "Priority MRI re-scan every 5 min",
    ],
  },
  {
    id: "spotlight", sol: 0.5, label: "KOL Spotlight", color: "#a855f7",
    perks: [
      "Everything in Trending Boost",
      "Broadcast alert to all KOL trackers",
      "Pinned at top of Trending for 12h",
      "Highlighted card with glow border",
    ],
  },
  {
    id: "package", sol: 1, label: "Launch Package", color: "#ff2b4e",
    perks: [
      "Everything in KOL Spotlight",
      "Telegram channel broadcast (10k+ members)",
      "24h homepage hero feature",
      "GEASS-verified badge on token card",
    ],
  },
] as const;
type BoostId = typeof BOOST_TIERS[number]["id"];

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";
const RED  = "#ff2b4e";
const DIM  = "#52525b";
const BG   = "#09090b";
const BG2  = "#111113";
const BDR  = "#27272a";

/* ── tiny icons ─────────────────────────────────────────── */
const Ico = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcoRocket  = ({ s = 16 }: { s?: number }) => <Ico size={s} d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2m7-7 2 2M9.5 6.5l2 2M15 5l4 4-9 9-6 0 0-6z" />;
const IcoCheck   = ({ s = 14 }: { s?: number }) => <Ico size={s} d="M20 6 9 17l-5-5" />;
const IcoCopy    = ({ s = 13 }: { s?: number }) => <Ico size={s} d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8zM14 2v6h6M10 12h4M10 16h4" />;
const IcoX       = ({ s = 12 }: { s?: number }) => <Ico size={s} d="M18 6 6 18M6 6l12 12" />;
const IcoImg     = ({ s = 24 }: { s?: number }) => <Ico size={s} d="M21 15l-5-5L5 20M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm6.5 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />;
const IcoChevron = ({ s = 14, open }: { s?: number; open: boolean }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const IcoGlobe = ({ s = 14 }: { s?: number }) => <Ico size={s} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />;
const IcoTwitter = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.254 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const IcoTelegram = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.448 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.834.932z"/>
  </svg>
);
const IcoDiscord = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

/* ── image drop zone ─────────────────────────────────────── */
function ImageDropZone({ file, preview, onFile, aspectRatio, hint, size }: {
  file: File | null;
  preview: string | null;
  onFile: (f: File | null) => void;
  aspectRatio?: string;
  hint?: string;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    onFile(f);
  };

  const box: React.CSSProperties = size
    ? { width: size, height: size, flexShrink: 0 }
    : { aspectRatio: aspectRatio ?? "1/1", minHeight: aspectRatio === "3/1" ? 90 : 100 };
  const compact = !!size && size < 110;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0] ?? null); }}
      style={{
        position: "relative", background: BG, border: `1.5px dashed ${drag ? RED : file ? "#10b981" : BDR}`,
        borderRadius: 12, cursor: "pointer", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        transition: "border-color .15s",
        ...box,
      }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handle(e.target.files?.[0] ?? null)} />
      {preview ? (
        <>
          <img src={preview} alt="preview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <button
            onClick={e => { e.stopPropagation(); onFile(null); }}
            style={{ position: "absolute", top: 4, right: 4, background: "#00000099", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <IcoX s={9} />
          </button>
        </>
      ) : (
        <>
          <div style={{ color: drag ? RED : "#3f3f46", marginBottom: compact ? 0 : 6 }}><IcoImg s={compact ? 20 : 24} /></div>
          {!compact && <div style={{ fontSize: 10, color: drag ? RED : "#3f3f46", fontWeight: 600 }}>{drag ? "Drop here" : "Click or drag"}</div>}
          {hint && !compact && <div style={{ fontSize: 9, color: "#2a2a2e", marginTop: 3 }}>{hint}</div>}
        </>
      )}
    </div>
  );
}

/* ── collapsible section ─────────────────────────────────── */
function Section({ title, badge, children, defaultOpen = false }: {
  title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${open ? "#2a2a30" : BDR}`, borderRadius: 12, overflow: "hidden", transition: "border-color .2s" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: open ? "#111115" : BG, border: "none", cursor: "pointer", color: "#f4f4f5" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".8px", fontFamily: MONO, flex: 1, textAlign: "left" }}>{title}</span>
        {badge && <span style={{ fontSize: 8, fontWeight: 700, color: "#3b82f6", background: "#3b82f615", border: "1px solid #3b82f630", padding: "1px 6px", borderRadius: 4, letterSpacing: ".5px" }}>{badge}</span>}
        <IcoChevron open={open} />
      </button>
      {open && <div style={{ padding: "0 14px 14px", background: BG2 }}>{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: DIM, letterSpacing: "1px", marginBottom: 5, fontFamily: MONO }}>{label}</div>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", background: BG, border: `1px solid ${BDR}`, borderRadius: 8,
  color: "#f4f4f5", padding: "9px 12px", fontSize: 12, outline: "none", boxSizing: "border-box",
  fontFamily: MONO,
};

function SocialInput({ icon, label, value, onChange, placeholder }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#18181b", border: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: DIM }}>
        {icon}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        aria-label={label}
        style={{ ...inp, padding: "7px 10px" }}
        onFocus={e => (e.currentTarget.style.borderColor = RED)}
        onBlur={e => (e.currentTarget.style.borderColor = BDR)} />
    </div>
  );
}

/* ── live preview card ───────────────────────────────────── */
function PreviewCard({ name, sym, desc, logoPreview, bannerPreview, socials }: {
  name: string; sym: string; desc: string;
  logoPreview: string | null; bannerPreview: string | null;
  socials: { website: string; twitter: string; telegram: string; discord: string };
}) {
  const displayName = name || "Token Name";
  const displaySym  = sym  || "SYM";
  const displayDesc = desc || "Your token description will appear here…";
  const hasSocials  = socials.website || socials.twitter || socials.telegram || socials.discord;

  return (
    <div style={{ background: "#0d0d10", border: `1px solid ${BDR}`, borderRadius: 16, overflow: "hidden", fontFamily: MONO }}>
      {/* banner */}
      <div style={{ height: 80, background: bannerPreview ? "transparent" : "linear-gradient(135deg,#1a0a0f,#0d0820)", position: "relative", overflow: "hidden" }}>
        {bannerPreview && <img src={bannerPreview} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,#0d0d1088)" }} />
        <div style={{ position: "absolute", bottom: -20, left: 14,
          width: 44, height: 44, borderRadius: "50%", border: "2.5px solid #0d0d10",
          background: logoPreview ? "transparent" : "linear-gradient(135deg,#dc262630,#7c3aed30)",
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "#f4f4f5" }}>
          {logoPreview
            ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : displaySym[0]?.toUpperCase()}
        </div>
      </div>

      <div style={{ padding: "26px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f5" }}>{displayName}</div>
            <div style={{ fontSize: 10, color: DIM, marginTop: 1 }}>${displaySym.toUpperCase()}</div>
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "#10b98118", border: "1px solid #10b98130", padding: "2px 7px", borderRadius: 4, letterSpacing: ".5px", marginTop: 2 }}>JUST LAUNCHED</span>
        </div>

        <div style={{ fontSize: 10, color: "#71717a", lineHeight: 1.6, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
          {displayDesc}
        </div>

        {hasSocials && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {socials.website  && <div title="Website"   style={{ width: 26, height: 26, borderRadius: 6, background: "#18181b", border: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "center", color: DIM }}><IcoGlobe s={12} /></div>}
            {socials.twitter  && <div title="Twitter/X" style={{ width: 26, height: 26, borderRadius: 6, background: "#18181b", border: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "center", color: DIM }}><IcoTwitter s={11} /></div>}
            {socials.telegram && <div title="Telegram"  style={{ width: 26, height: 26, borderRadius: 6, background: "#18181b", border: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "center", color: DIM }}><IcoTelegram s={11} /></div>}
            {socials.discord  && <div title="Discord"   style={{ width: 26, height: 26, borderRadius: 6, background: "#18181b", border: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "center", color: DIM }}><IcoDiscord s={11} /></div>}
          </div>
        )}

        {/* bonding curve */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3f3f46", letterSpacing: ".8px", marginBottom: 3 }}>
            <span>BONDING CURVE</span>
            <span style={{ color: "#7c3aed", fontWeight: 700 }}>0% · 0.0 SOL</span>
          </div>
          <div style={{ height: 4, background: "#18181b", borderRadius: 2 }}>
            <div style={{ width: "2%", height: "100%", background: "#7c3aed", borderRadius: 2 }} />
          </div>
        </div>

        {/* stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
          {[["MCAP", "~$69k"], ["HOLDERS", "1"], ["AGE", "now"]].map(([l, v]) => (
            <div key={l} style={{ background: "#09090b", borderRadius: 6, padding: "5px 7px" }}>
              <div style={{ fontSize: 7, color: "#3f3f46", letterSpacing: ".8px" }}>{l}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#d4d4d8", marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8, fontSize: 8, color: "#2a2a2e", textAlign: "center", letterSpacing: ".5px" }}>PREVIEW · pump.fun</div>
      </div>
    </div>
  );
}

/* ── success screen ──────────────────────────────────────── */
function SuccessScreen({ sym, mintAddress, onReset }: { sym: string; mintAddress: string; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(mintAddress); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#10b98118", border: "1px solid #10b98140", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IcoRocket s={32} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", letterSpacing: ".5px" }}>LAUNCHED</div>
        <div style={{ fontSize: 12, color: DIM, marginTop: 4 }}>${sym.toUpperCase()} is live on Pump.fun</div>
      </div>
      <div style={{ width: "100%", maxWidth: 400, background: BG, border: `1px solid ${BDR}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: DIM, letterSpacing: "1px", flexShrink: 0 }}>CA</span>
        <span style={{ fontSize: 10, color: "#a1a1aa", fontFamily: MONO, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mintAddress}</span>
        <button onClick={copy} title="Copy" style={{ background: "none", border: "none", color: copied ? "#10b981" : DIM, cursor: "pointer", padding: 2, flexShrink: 0 }}>
          {copied ? <IcoCheck s={13} /> : <IcoCopy s={13} />}
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <a href={`https://pump.fun/coin/${mintAddress}`} target="_blank" rel="noopener noreferrer"
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${BDR}`, background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
          Pump.fun ↗
        </a>
        <a href={`https://dexscreener.com/solana/${mintAddress}`} target="_blank" rel="noopener noreferrer"
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #f9731640", background: "#f9731612", color: "#f97316", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
          DexScreener ↗
        </a>
        <button onClick={onReset} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${BDR}`, background: "transparent", color: DIM, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Launch another
        </button>
      </div>
    </div>
  );
}

/* ── main export ─────────────────────────────────────────── */
export function LaunchTab({ wallet, wBal, isMobile }: {
  wallet: string;
  wBal?: string | null;
  isMobile: boolean;
}) {
  const [name,    setName]    = useState("");
  const [sym,     setSym]     = useState("");
  const [desc,    setDesc]    = useState("");
  const [devBuy,  setDevBuy]  = useState("0.5");
  const [socials, setSocials] = useState({ website: "", twitter: "", telegram: "", discord: "" });
  const [jito,    setJito]    = useState(true);
  const [jitoMode, setJitoMode] = useState<"phantom" | "server">("phantom");
  const [tip,     setTip]     = useState("0.003");

  const [logoFile,      setLogoFile]      = useState<File | null>(null);
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null);
  const [bannerFile,    setBannerFile]    = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [boost,   setBoost]   = useState<BoostId | null>(null);

  const [step,        setStep]        = useState<"form" | "done">("form");
  const [loading,     setLoading]     = useState(false);
  const [msg,         setMsg]         = useState("");
  const [mintAddress, setMintAddress] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => () => {
    if (logoPreview)   URL.revokeObjectURL(logoPreview);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoFile = useCallback((f: File | null) => {
    setLogoFile(f);
    setLogoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return f ? URL.createObjectURL(f) : null; });
  }, []);

  const handleBannerFile = useCallback((f: File | null) => {
    setBannerFile(f);
    setBannerPreview(prev => { if (prev) URL.revokeObjectURL(prev); return f ? URL.createObjectURL(f) : null; });
  }, []);

  const reset = () => {
    setName(""); setSym(""); setDesc(""); setDevBuy("0.5"); setMsg("");
    setSocials({ website: "", twitter: "", telegram: "", discord: "" });
    setBoost(null);
    handleLogoFile(null); handleBannerFile(null);
    setStep("form");
  };

  /** Poll the chain until the mint account actually exists (bundle landed). */
  const confirmOnChain = async (mint: string): Promise<boolean> => {
    for (let i = 0; i < 20; i++) {
      try {
        const r = await fetch(`/api/pump/confirm?mint=${mint}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json() as { exists?: boolean };
          if (j.exists) return true;
        }
      } catch { /* retry */ }
      setMsg(`Confirming on-chain… (${i + 1}/20)`);
      await new Promise(res => setTimeout(res, 2_000));
    }
    return false;
  };

  /** Charge the selected growth-boost tier — SOL transfer to GEASS treasury. */
  const payBoost = async (mint: string) => {
    const tier = BOOST_TIERS.find(t => t.id === boost);
    if (!tier) return;
    if (!TREASURY) { setMsg(`Token live ✓ — boost skipped (treasury not configured)`); return; }
    try {
      setMsg(`Approve ${tier.label} payment (${tier.sol} SOL)…`);
      const conn = new Connection(RPC_URL, "confirmed");
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
      const tx = new Transaction({ feePayer: new PublicKey(wallet), blockhash, lastValidBlockHeight });
      tx.add(SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet),
        toPubkey:   new PublicKey(TREASURY),
        lamports:   Math.floor(tier.sol * LAMPORTS_PER_SOL),
      }));
      const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      await signAndSendBytes(bytes);
      setMsg(`${tier.label} activated ✓`);
    } catch (e) {
      // Token already launched — boost payment failure is non-fatal
      setMsg(`Token live ✓ — boost payment failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const launch = async () => {
    if (!name || !sym) { setMsg("Fill in Name & Symbol"); return; }
    setLoading(true); setMsg("");
    try {
      let mint = "";
      if (jito) {
        setMsg("Uploading metadata…");
        const result = await jitoLaunchBundle({
          name, symbol: sym, description: desc || name,
          devBuySol: parseFloat(devBuy) || 0,
          tipSol: parseFloat(tip) || 0.003,
          file: logoFile ?? undefined,
          wallet: jitoMode === "phantom" ? wallet : undefined,
          server: jitoMode === "server",
          twitter:  socials.twitter  || undefined,
          telegram: socials.telegram || undefined,
          website:  socials.website  || undefined,
        });
        mint = result.mintPubkey;

        if (result.mode !== "server") {
          const hasBuy = (parseFloat(devBuy) || 0) > 0 && result.buyTxB64;
          const txsToSign: Uint8Array[] = [new Uint8Array(Buffer.from(result.createTxB64, "base64"))];
          if (hasBuy) txsToSign.push(new Uint8Array(Buffer.from(result.buyTxB64, "base64")));
          setMsg(`Sign in Phantom (${txsToSign.length} tx)…`);
          const signedB64s = await signAllWithPhantom(txsToSign);
          setMsg("Submitting Jito bundle…");
          const txsForBundle = hasBuy ? [signedB64s[0], signedB64s[1]] : [signedB64s[0]];
          await jitoSubmit(txsForBundle, parseFloat(tip) || 0.003);
        }
      } else {
        setMsg("Uploading metadata…");
        const form = new FormData();
        form.append("name", name);
        form.append("symbol", sym.toUpperCase());
        form.append("description", desc || name);
        form.append("showName", "true");
        if (socials.twitter)  form.append("twitter",  socials.twitter);
        if (socials.telegram) form.append("telegram", socials.telegram);
        if (socials.website)  form.append("website",  socials.website);
        if (logoFile) form.append("file", logoFile, logoFile.name);
        const meta = await pumpIpfs(form);
        setMsg("Building transaction…");
        const mintKp = Keypair.generate();
        const bytes = await pumpTradeTx({
          publicKey: wallet, action: "create",
          mint: mintKp.publicKey.toBase58(),
          amount: parseFloat(devBuy) || 0,
          slippage: 10, priorityFee: 0.0005, pool: "pump",
          tokenMetadata: { name, symbol: sym.toUpperCase(), uri: meta.metadataUri },
        });
        const tx = VersionedTransaction.deserialize(bytes);
        tx.sign([mintKp]);
        setMsg("Sign in Phantom…");
        await signAndSendBytes(tx.serialize());
        mint = mintKp.publicKey.toBase58();
      }

      // ── Verify the token is REAL on-chain before declaring success ──
      setMsg("Confirming on-chain…");
      const landed = await confirmOnChain(mint);
      if (!landed) {
        setMsg("Bundle was accepted but the token did not land on-chain within 40s. It may still appear shortly — check the CA on Solscan. Common cause: Jito tip too low, expired blockhash, or unfunded GEASS tip wallet.");
        setLoading(false);
        return;
      }

      setMintAddress(mint);
      // Optional paid growth boost (token is already live)
      if (boost) await payBoost(mint);
      setStep("done");
    } catch (e) {
      setMsg("Error: " + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  };

  if (step === "done") {
    return (
      <div style={{ padding: isMobile ? "14px 14px 64px" : "24px 28px", maxWidth: 600, margin: "0 auto" }}>
        <SuccessScreen sym={sym} mintAddress={mintAddress} onReset={reset} />
      </div>
    );
  }

  const formSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <Section title="TOKEN IDENTITY" defaultOpen>
        <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* compact logo + name/symbol inline */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 9, color: DIM, letterSpacing: "1px", marginBottom: 6, fontFamily: MONO }}>LOGO</div>
              <ImageDropZone file={logoFile} preview={logoPreview} onFile={handleLogoFile} size={84} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="NAME *">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Moon Pepe" style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BDR)} />
              </Field>
              <Field label="SYMBOL *">
                <input value={sym} onChange={e => setSym(e.target.value.slice(0, 10))} placeholder="MPEPE" style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BDR)} />
              </Field>
            </div>
          </div>
          <Field label="DESCRIPTION">
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's your token about?" rows={3}
              style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
          </Field>
        </div>
      </Section>

      {/* ── all optional metadata in one place ── */}
      <Section title="OPTIONAL" badge="BANNER + SOCIALS">
        <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 9, color: DIM, letterSpacing: "1px", marginBottom: 6, fontFamily: MONO }}>BANNER · 1200×400</div>
            <ImageDropZone file={bannerFile} preview={bannerPreview} onFile={handleBannerFile}
              aspectRatio="3/1" hint="Shown behind your token header" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 9, color: DIM, letterSpacing: "1px", fontFamily: MONO }}>SOCIAL LINKS</div>
            <SocialInput icon={<IcoGlobe s={13} />}    label="Website"   value={socials.website}   onChange={v => setSocials(s => ({ ...s, website: v }))}   placeholder="https://yourtoken.xyz" />
            <SocialInput icon={<IcoTwitter s={13} />}  label="Twitter/X" value={socials.twitter}   onChange={v => setSocials(s => ({ ...s, twitter: v }))}   placeholder="https://x.com/yourtoken" />
            <SocialInput icon={<IcoTelegram s={13} />} label="Telegram"  value={socials.telegram}  onChange={v => setSocials(s => ({ ...s, telegram: v }))}  placeholder="https://t.me/yourtoken" />
            <SocialInput icon={<IcoDiscord s={13} />}  label="Discord"   value={socials.discord}   onChange={v => setSocials(s => ({ ...s, discord: v }))}   placeholder="https://discord.gg/yourtoken" />
          </div>
        </div>
      </Section>

      {/* ── paid growth boosts ── */}
      <Section title="GROWTH BOOST" badge="OPTIONAL">
        <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 9, color: DIM, lineHeight: 1.6, marginBottom: 2 }}>
            Paid promotion to help your token gain traction. Charged on launch — paid to the GEASS treasury.
          </div>
          {BOOST_TIERS.map(t => {
            const active = boost === t.id;
            return (
              <button key={t.id} onClick={() => setBoost(active ? null : t.id)}
                style={{ textAlign: "left", cursor: "pointer", borderRadius: 10, padding: "11px 12px",
                  border: `1px solid ${active ? t.color : BDR}`,
                  background: active ? `${t.color}12` : BG, transition: "border-color .15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: active ? t.color : "#f4f4f5" }}>{t.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.color, fontFamily: MONO }}>{t.sol} SOL</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {t.perks.map((p, i) => (
                    <div key={i} style={{ fontSize: 9, color: active ? "#a1a1aa" : "#71717a", display: "flex", gap: 5, alignItems: "flex-start" }}>
                      <span style={{ color: t.color, flexShrink: 0 }}>✓</span>{p}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
          {boost && (
            <button onClick={() => setBoost(null)}
              style={{ alignSelf: "flex-start", fontSize: 9, color: DIM, background: "none", border: "none", cursor: "pointer", padding: "2px 0", textDecoration: "underline" }}>
              Clear selection — launch without boost
            </button>
          )}
        </div>
      </Section>

      <Section title="LAUNCH SETTINGS" defaultOpen>
        <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: DIM, letterSpacing: "1px", marginBottom: 5, fontFamily: MONO }}>
              <span>DEV BUY</span>
              <span style={{ color: "#eab308", fontWeight: 700 }}>{devBuy} SOL</span>
            </div>
            <input type="range" min="0" max="5" step="0.1" value={devBuy} onChange={e => setDevBuy(e.target.value)}
              style={{ width: "100%", accentColor: RED }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3f3f46", marginTop: 2 }}>
              <span>0 — no buy</span><span>5 SOL — max</span>
            </div>
          </div>

          <div style={{ border: `1px solid ${jito ? "#7c3aed40" : BDR}`, borderRadius: 10, padding: "11px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: jito ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: jito ? "#a855f7" : "#71717a", display: "flex", alignItems: "center", gap: 6 }}>
                  Jito Bundle
                  <span style={{ fontSize: 8, background: "#10b98120", color: "#10b981", border: "1px solid #10b98140", padding: "1px 5px", borderRadius: 4 }}>RECOMMENDED</span>
                </div>
                <div style={{ fontSize: 9, color: DIM, marginTop: 1 }}>Atomic create + buy · anti-MEV · faster</div>
              </div>
              <button onClick={() => setJito(v => !v)}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: jito ? "#a855f7" : BDR, transition: "background .2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 2, left: jito ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
              </button>
            </div>
            {jito && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {(["phantom", "server"] as const).map(m => (
                    <button key={m} onClick={() => setJitoMode(m)}
                      style={{ flex: 1, padding: "6px 8px", borderRadius: 7, cursor: "pointer", fontSize: 9, fontWeight: 700,
                        border: `1px solid ${jitoMode === m ? "#a855f7" : BDR}`,
                        background: jitoMode === m ? "#a855f712" : "transparent",
                        color: jitoMode === m ? "#a855f7" : DIM }}>
                      {m === "phantom" ? "Phantom signs" : "GEASS wallet"}
                    </button>
                  ))}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: DIM, marginBottom: 4 }}>
                    <span>JITO TIP</span>
                    <span style={{ color: "#a855f7", fontWeight: 700 }}>{parseFloat(tip).toFixed(4)} SOL</span>
                  </div>
                  <input type="range" min="0.001" max="0.01" step="0.0005" value={tip} onChange={e => setTip(e.target.value)}
                    style={{ width: "100%", accentColor: "#a855f7" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3f3f46", marginTop: 2 }}>
                    <span>0.001 — economical</span><span>0.01 — fastest</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {msg && (
        <div style={{ fontSize: 10, color: msg.startsWith("Error") ? "#f59e0b" : "#10b981", padding: "7px 12px",
          background: msg.startsWith("Error") ? "#f59e0b10" : "#10b98110",
          border: `1px solid ${msg.startsWith("Error") ? "#f59e0b30" : "#10b98130"}`, borderRadius: 8, textAlign: "center" }}>
          {msg}
        </div>
      )}

      {boost && (
        <div style={{ fontSize: 9, color: DIM, textAlign: "center" }}>
          + {BOOST_TIERS.find(t => t.id === boost)?.label} ({BOOST_TIERS.find(t => t.id === boost)?.sol} SOL) charged after launch
        </div>
      )}

      <button onClick={launch} disabled={loading || !name || !sym}
        style={{ background: jito ? "linear-gradient(135deg,#7c3aed,#a855f7)" : `linear-gradient(135deg,${RED},#7c3aed)`,
          border: "none", color: "#fff", padding: "13px 20px", borderRadius: 10, fontSize: 13, fontWeight: 800,
          cursor: loading ? "wait" : "pointer", letterSpacing: ".5px", opacity: (!name || !sym) ? 0.4 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {loading
          ? <span>↻ Processing…</span>
          : <><IcoRocket s={14} /> {jito ? "LAUNCH VIA JITO BUNDLE" : "LAUNCH ON-CHAIN"}</>}
      </button>
    </div>
  );

  const previewSection = (
    <div style={{ position: isMobile ? "relative" : "sticky", top: isMobile ? undefined : 20 }}>
      <div style={{ fontSize: 9, color: DIM, letterSpacing: "1px", marginBottom: 8, fontFamily: MONO }}>MARKET PREVIEW</div>
      <PreviewCard name={name} sym={sym} desc={desc} logoPreview={logoPreview} bannerPreview={bannerPreview} socials={socials} />
      <div style={{ marginTop: 8, fontSize: 9, color: "#2a2a2e", textAlign: "center" }}>Updates live as you type</div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "14px 14px 64px" : "24px 28px" }}>
      {/* header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${RED}15`, border: `1px solid ${RED}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IcoRocket s={16} />
          </div>
          <h1 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "#f4f4f5", margin: 0 }}>Launch Token</h1>
        </div>
        <p style={{ fontSize: 11, color: DIM, margin: 0 }}>Create & deploy on Pump.fun · 100% on-chain via Phantom</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "5px 10px", background: "#10b98110", border: "1px solid #10b98130", borderRadius: 8 }}>
          <IcoCheck s={11} />
          <span style={{ fontSize: 10, color: "#10b981", fontFamily: MONO }}>{wallet.slice(0, 8)}…{wallet.slice(-6)}</span>
          {wBal && <span style={{ fontSize: 9, color: DIM }}>{wBal} SOL</span>}
        </div>
      </div>

      {isMobile ? (
        <div>
          <div style={{ display: "flex", gap: 0, marginBottom: 14, background: BG, border: `1px solid ${BDR}`, borderRadius: 10, padding: 3 }}>
            {[["form", "Form"], ["preview", "Preview"]].map(([v, l]) => (
              <button key={v} onClick={() => setShowPreview(v === "preview")}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                  background: (v === "preview") === showPreview ? "#18181b" : "transparent",
                  color: (v === "preview") === showPreview ? "#f4f4f5" : DIM }}>
                {l}
              </button>
            ))}
          </div>
          {showPreview ? previewSection : formSection}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
          {formSection}
          {previewSection}
        </div>
      )}
    </div>
  );
}
