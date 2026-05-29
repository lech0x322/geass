"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Keypair, VersionedTransaction, PublicKey, Transaction, SystemProgram, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { KOLS, NAV, TIER, SETTINGS_TAB_OVERRIDES } from "@/lib/config";
import { fmtAge, shortAddr } from "@/lib/utils";
import { scan, fetchBalance, pumpTradeTx, pumpIpfs, fetchPortfolio, autoSnipe, jitoLaunchBundle, jitoSubmit, fetchTrending, fetchMemeSignals, fetchXSignals, type PortfolioResult, type AutoSnipeResult, type TrendingToken, type TrendingMeta, type MemeSignal, type NarrativeStat, type XSignal } from "@/lib/api";
import { signAllWithPhantom } from "@/lib/wallet";
import { signAndSendBytes } from "@/lib/wallet";
import { useGemStream } from "@/lib/useGemStream";
import { useProStatus } from "@/lib/pro";
import { useKolFeed } from "@/lib/useKolFeed";
import { useSignalSocket } from "@/lib/signal-socket";
import type { Gem } from "@/lib/types";
import { GeassLogo } from "./GeassLogo";
import { GemCard } from "./GemCard";
import { SnipeModal } from "./SnipeModal";
import { TokenModal } from "./TokenModal";
import { InternalWalletPanel } from "./InternalWalletPanel";
import { useInternalWallet } from "@/lib/useInternalWallet";
import {
  IconBroadcast, IconFlame, IconRocket, IconZap, IconTarget, IconUsers,
  IconCog, IconCrown, IconChevronDown, IconSolana, IconSearch, IconX,
  IconMenu, IconRefresh, IconLock, IconSpeaker, IconWallet, IconPower,
  IconCheck, IconChart, IconArrowUpRight, IconCopy, IconUser, IconHome,
  IconGlobe, IconBot,
} from "./icons";
import { ProfileTab } from "./ProfileTab";
import { ProfilePanel } from "./ProfilePanel";
import { HomeTab } from "./HomeTab";
import { CommunityTab } from "./CommunityTab";
import { PredictionsTab } from "./PredictionsTab";
import { SocialTrackerTab } from "./SocialTrackerTab";
import { AiTradingTab } from "./AiTradingTab";
import IntelTab from "./IntelTab";
import { WatchlistTab } from "./WatchlistTab";
import { useWatchlist } from "@/lib/useWatchlist";
import { NotificationsBell } from "./NotificationsBell";
import { pushNotification } from "@/lib/useNotifications";
import JupiterSwapModal from "./JupiterSwapModal";
import type { NavIconId, SettingsSection } from "@/lib/config";

const NAV_ICON: Record<NavIconId, React.FC<{ size?: number }>> = {
  home:      IconHome,
  broadcast: IconBroadcast,
  flame:     IconFlame,
  rocket:    IconRocket,
  zap:       IconZap,
  target:    IconTarget,
  users:     IconUsers,
  cog:       IconCog,
  crown:     IconCrown,
  user:      IconUser,
  chart:     IconChart,
  globe:     IconGlobe,
  bot:       IconBot,
};

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";

const APP_CSS = `
@keyframes dot-pulse    { 0%,100%{opacity:1} 50%{opacity:.25} }
@keyframes ticker-scroll{ 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes spin         { to{transform:rotate(360deg)} }
@keyframes pulse-anim   { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes slide-in     { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
@keyframes glow-pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(255,43,78,0)} 50%{box-shadow:0 0 0 4px rgba(255,43,78,0.15)} }
@keyframes fade-in      { from{opacity:0} to{opacity:1} }

/* Scrollbar — ultra thin, pure-black */
::-webkit-scrollbar       { width:3px;height:3px }
::-webkit-scrollbar-track { background:transparent }
::-webkit-scrollbar-thumb { background:#2a2a30 }
::-webkit-scrollbar-thumb:hover { background:#3a3a42 }

/* Cards — sharp, architectural */
.g-card { background:#070708;border:1px solid #18181c;transition:border-color .2s,background .2s }
.g-card:hover { border-color:#2a2a30;background:#0a0a0c }

/* Nav items */
.nav-item { transition:background .15s,color .15s !important }
.nav-item:hover { background:#0d0d10 !important;color:#f5f5f7 !important }
.nav-item-active { background:#0d0d10 !important; border-left:2px solid #ff2b4e !important }

/* Inputs */
input,textarea,select { transition:border-color .15s,box-shadow .15s }
input:focus,textarea:focus { border-color:#ff2b4e !important;box-shadow:0 0 0 1px #ff2b4e35 !important }

/* Buttons — sharp, 1px red command-line */
.btn-primary { background:transparent;border:1px solid #ff2b4e;color:#ff2b4e;font-weight:700;cursor:pointer;transition:background .15s,color .15s,box-shadow .2s }
.btn-primary:hover { background:#ff2b4e;color:#fff;box-shadow:0 0 28px #ff2b4e35 }
.btn-primary:active { background:#e0203f }

/* Grid helpers */
.app-g4 { display:grid;grid-template-columns:repeat(4,1fr);gap:8px }
.app-g3 { display:grid;grid-template-columns:repeat(3,1fr);gap:10px }
.app-g2 { display:grid;grid-template-columns:1fr 1fr;gap:14px }

/* Status dot */
.live-dot { width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block;animation:dot-pulse 2s ease-in-out infinite }
.spin  { animation:spin 1s linear infinite;display:inline-block }
.pulse { animation:pulse-anim 1.5s ease-in-out infinite }

/* Ticker */
.ticker-track { display:flex;animation:ticker-scroll 28s linear infinite;width:max-content }
.ticker-track:hover { animation-play-state:paused }

/* Range input */
input[type=range] { -webkit-appearance:none;width:100%;height:3px;background:#18181c;outline:none;cursor:pointer }
input[type=range]::-webkit-slider-thumb { -webkit-appearance:none;width:14px;height:14px;background:#ff2b4e;border:1px solid #000;cursor:pointer }
input[type=range]::-moz-range-thumb     { width:14px;height:14px;background:#ff2b4e;cursor:pointer;border:1px solid #000 }

@media (max-width:768px) {
  .app-g4 { grid-template-columns:1fr 1fr !important;gap:6px !important }
  .app-g3 { grid-template-columns:1fr 1fr !important;gap:8px !important }
  .app-g2 { grid-template-columns:1fr !important;gap:10px !important }
  .desktop-col { display:none !important }
}
`;

const NavIcon = ({ id, size = 14 }: { id: NavIconId; size?: number }) => {
  const C = NAV_ICON[id];
  return <C size={size} />;
};

/** Scrolls the requested settings section into view when it mounts/changes. */
function SettingsBody({ section, children }: { section: SettingsSection | null; children: React.ReactNode }) {
  useEffect(() => {
    if (!section) return;
    const el = document.getElementById(`settings-${section}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);
  return <>{children}</>;
}

function ComingSoonTab({ label, desc, isMobile }: { label: string; desc: string; isMobile?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, padding: isMobile ? 24 : 48, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#f4f4f5", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#52525b", maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>{desc}</div>
      <div style={{ padding: "6px 16px", borderRadius: 20, background: "#ff2b4e18", border: "1px solid #ff2b4e44", color: "#ff2b4e", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>COMING SOON</div>
    </div>
  );
}

// ── Sound system ──────────────────────────────────────────────────────────────
export type SoundId = "chime" | "ping" | "bell" | "buzz" | "tap" | "arcade" | "alert" | "soft" | "off";

export const SOUND_OPTIONS: { id: SoundId; label: string; emoji: string }[] = [
  { id: "chime",  label: "Chime",  emoji: "🎵" },
  { id: "ping",   label: "Ping",   emoji: "🔔" },
  { id: "bell",   label: "Bell",   emoji: "🛎" },
  { id: "buzz",   label: "Buzz",   emoji: "📳" },
  { id: "tap",    label: "Tap",    emoji: "👆" },
  { id: "arcade", label: "Arcade", emoji: "🕹" },
  { id: "alert",  label: "Alert",  emoji: "⚡" },
  { id: "soft",   label: "Soft",   emoji: "🌊" },
  { id: "off",    label: "Off",    emoji: "🔇" },
];

interface Props {
  wallet: string;
  balance: string | null;
  onDisconnect: () => void;
}

export function App({ wallet, balance: initialBalance, onDisconnect }: Props) {
  const [tab, setTab]         = useState<"home" | "trades" | "launch" | "gems" | "autosnipe" | "referral" | "pro" | "settings" | "trending" | "profile" | "community" | "predictions" | "social" | "ai-trading" | "intel">("home");
  const [gems, setGems]       = useState<Gem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [scanTime, setScanTime] = useState<string | null>(null);
  const [source, setSource]   = useState("");
  const [newIds, setNewIds]   = useState<Set<string>>(new Set());
  const [snipeGem, setSnipeGem] = useState<Gem | null>(null);
  const [dexToken, setDexToken] = useState<{ address: string; symbol: string } | null>(null);
  const [jupModal, setJupModal] = useState<{ mint: string; symbol: string; mode: "buy" | "sell" } | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ baseToken: { address: string; name: string; symbol: string }; priceUsd: string | null; priceChange: Record<string, number> | null; volume: Record<string, number>; liquidity: { usd: number | null } | null; url: string; info?: { imageUrl?: string } }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState<"all" | "tokens" | "kol" | "wallets">("all");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSolanaAddress = (q: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q.trim());
  const [caScore, setCaScore] = useState<{ total: number; tier: string; sym: string; signals: string[] } | null>(null);
  const [caScoreLoading, setCaScoreLoading] = useState(false);
  const scanCA = useCallback((mint: string) => {
    setCaScore(null); setCaScoreLoading(true);
    fetch(`/api/mri/score?mint=${encodeURIComponent(mint)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCaScore(d); setCaScoreLoading(false); })
      .catch(() => setCaScoreLoading(false));
  }, []);
  const kolMatches = searchQ.length >= 2
    ? KOLS.filter(k =>
        k.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        k.tw.toLowerCase().includes(searchQ.toLowerCase()) ||
        k.addr.toLowerCase().startsWith(searchQ.toLowerCase())
      )
    : [];
  const [ctMintAddress, setCtMintAddress] = useState<string | null>(null);
  const [wBal, setWBal]       = useState<string | null>(initialBalance);
  const [phantomSendTo,  setPhantomSendTo]  = useState("");
  const [phantomSendAmt, setPhantomSendAmt] = useState("");
  const [phantomSendMsg, setPhantomSendMsg] = useState("");
  const [phantomSending, setPhantomSending] = useState(false);
  const [filters, setFilters] = useState({ minScore: 0, tiers: [] as string[], hasKol: false, noFlags: false });
  const feedTrades = useKolFeed();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pro = useProStatus(wallet);
  const iw = useInternalWallet();
  const [portfolio, setPortfolio] = useState<PortfolioResult | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioErr, setPortfolioErr] = useState("");

  // Trending
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [trendingMetas,  setTrendingMetas]  = useState<TrendingMeta[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [memeSignals,    setMemeSignals]    = useState<MemeSignal[]>([]);
  const [memeNarratives, setMemeNarratives] = useState<NarrativeStat[]>([]);
  const [memeLoading,    setMemeLoading]    = useState(false);
  const [xSignals,       setXSignals]       = useState<XSignal[]>([]);
  const [xLoading,       setXLoading]       = useState(false);
  const [memeTab,        setMemeTab]        = useState<"dex" | "meme" | "x">("dex");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(true);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const [gemSoundId,        setGemSoundId]        = useState<SoundId>("chime");
  const [kolSoundId,        setKolSoundId]        = useState<SoundId>("tap");
  const [memeSoundId,       setMemeSoundId]       = useState<SoundId>("buzz");
  const [communitySoundId,  setCommunitySoundId]  = useState<SoundId>("ping");
  const [geassAlertSoundId, setGeassAlertSoundId] = useState<SoundId>("alert");
  const [soundExpandedKey,  setSoundExpandedKey]  = useState<string | null>(null);
  const watchlist = useWatchlist();
  const [tradingSlippage,   setTradingSlippage]   = useState<string>("10");
  const [tradingPriorityFee,setTradingPriorityFee]= useState<string>("0.0005");
  const [tradingMaxBuy,     setTradingMaxBuy]     = useState<string>("0.1");
  const [solPrice, setSolPrice]     = useState<number | null>(null);
  const [solChange, setSolChange]   = useState(0);

  // Auto-snipe state
  const [asEnabled, setAsEnabled]         = useState(false);
  const [asAmount, setAsAmount]           = useState("0.01");
  const [asMinScore, setAsMinScore]       = useState(75);
  const [asMethod, setAsMethod]           = useState<"api" | "local">("api");
  const [asLog, setAsLog]                 = useState<{ mint: string; sym: string; sig?: string; err?: string; ts: number }[]>([]);
  const asSniped = useRef<Set<string>>(new Set());

  // Referral state
  const refCode = wallet.slice(0, 8);
  const [refLink, setRefLink] = useState("");
  const [refCopied, setRefCopied] = useState(false);
  const [refStats, setRefStats] = useState<{ clicks: number; referrals: number } | null>(null);
  const freeMonths = refStats ? Math.floor(refStats.referrals / 3) : 0;
  // GEASS Points: 300/pro-ref + 2/click. SOL estimate from 5% fee share
  const geassPoints = refStats ? (refStats.referrals * 300) + (refStats.clicks * 2) : 0;
  const solEarned   = refStats ? (refStats.referrals * 0.003).toFixed(3) : "0.000";

  // Launch state
  const [ct, setCt]           = useState({ name: "", sym: "", desc: "", img: "", devBuy: "0.5" });
  const [ctFile, setCtFile]   = useState<File | null>(null);
  const [ctStep, setCtStep]   = useState<"form" | "done">("form");
  const [ctLoad, setCtLoad]   = useState(false);
  const [ctMsg, setCtMsg]     = useState("");
  const [ctJito, setCtJito]   = useState(true);
  const [ctTip, setCtTip]     = useState("0.003");
  const [ctJitoMode, setCtJitoMode] = useState<"phantom" | "server">("phantom");

  const newIdsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mobile detection ────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Sound helpers ─────────────────────────────────────────────────────────
  // One shared AudioContext per page. Browsers suspend new contexts created
  // outside a user-gesture; resume() before every note lets automatic alerts
  // play once the user has clicked the page at least once.
  const audioCtxRef = useRef<AudioContext | null>(null);
  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }
  useEffect(() => {
    const unlock = () => { try { getAudioCtx().resume().catch(() => {}); } catch {} };
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function playSound(id: SoundId) {
    if (id === "off") return;
    try {
      const ctx = getAudioCtx();
      const doPlay = () => {
        try {
          const t = ctx.currentTime;
          const note = (type: OscillatorType, freq: number, start: number, dur: number, vol = 0.11) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, t + start);
            gain.gain.setValueAtTime(vol, t + start);
            gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t + start); osc.stop(t + start + dur);
          };
          switch (id) {
            case "chime":
              [0, 0.20].forEach((off, i) => {
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(880 * (i + 1), t + off);
                osc.frequency.linearRampToValueAtTime(1320 * (i + 1), t + off + 0.14);
                gain.gain.setValueAtTime(0.11, t + off);
                gain.gain.exponentialRampToValueAtTime(0.001, t + off + 0.30);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(t + off); osc.stop(t + off + 0.30);
              }); break;
            case "ping":
              note("sine", 1760, 0, 0.25, 0.10); break;
            case "bell": {
              const osc = ctx.createOscillator(); const gain = ctx.createGain();
              osc.type = "sine"; osc.frequency.setValueAtTime(880, t);
              gain.gain.setValueAtTime(0.15, t);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
              osc.connect(gain); gain.connect(ctx.destination);
              osc.start(t); osc.stop(t + 0.8); break;
            }
            case "buzz": {
              const osc = ctx.createOscillator(); const gain = ctx.createGain();
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(1047, t);
              osc.frequency.exponentialRampToValueAtTime(523, t + 0.18);
              osc.frequency.setValueAtTime(523, t + 0.20);
              osc.frequency.linearRampToValueAtTime(698, t + 0.38);
              gain.gain.setValueAtTime(0.08, t);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
              osc.connect(gain); gain.connect(ctx.destination);
              osc.start(t); osc.stop(t + 0.45); break;
            }
            case "tap":
              [{ f: 660, o: 0 }, { f: 990, o: 0.18 }].forEach(({ f, o }) => note("triangle", f, o, 0.22, 0.14)); break;
            case "arcade":
              [523, 659, 784, 1047].forEach((f, i) => note("square", f, i * 0.08, 0.10, 0.07)); break;
            case "alert":
              note("sine", 1320, 0, 0.15, 0.12); note("sine", 880, 0.18, 0.20, 0.10); break;
            case "soft":
              note("sine", 528, 0, 0.5, 0.07); note("sine", 660, 0.15, 0.4, 0.05); break;
          }
        } catch {}
      };
      if (ctx.state === "running") { doPlay(); } else { ctx.resume().then(doPlay).catch(() => {}); }
    } catch {}
  }

  // ── Real-time SSE stream ────────────────────────────────────
  const stream = useGemStream(true);

  // Keep latest auto-snipe settings + internal wallet ref so stream callback sees current values
  const iwRef = useRef(iw);
  useEffect(() => { iwRef.current = iw; }, [iw]);
  const asRef = useRef({ enabled: false, amount: "0.01", minScore: 75, method: "api" as "api" | "local" });
  useEffect(() => {
    asRef.current = { enabled: asEnabled, amount: asAmount, minScore: asMinScore, method: asMethod };
  }, [asEnabled, asAmount, asMinScore, asMethod]);

  const soundRef = useRef<{ gems: SoundId; kol: SoundId; meme: SoundId; community: SoundId; geass: SoundId }>({ gems: "chime", kol: "tap", meme: "buzz", community: "ping", geass: "alert" });
  useEffect(() => { soundRef.current = { gems: gemSoundId, kol: kolSoundId, meme: memeSoundId, community: communitySoundId, geass: geassAlertSoundId }; }, [gemSoundId, kolSoundId, memeSoundId, communitySoundId, geassAlertSoundId]);

  useEffect(() => {
    if (!stream.newGems.length) return;
    let freshGems: typeof stream.newGems = [];
    setGems(prev => {
      const known = new Set(prev.map(g => g.id));
      const fresh = stream.newGems.filter(g => !known.has(g.id));
      freshGems = fresh;
      if (!fresh.length) return prev;
      const next = [...fresh, ...prev].slice(0, 24);
      setNewIds(ids => {
        const merged = new Set(ids);
        fresh.forEach(g => merged.add(g.id));
        return merged;
      });
      if (newIdsTimer.current) clearTimeout(newIdsTimer.current);
      newIdsTimer.current = setTimeout(() => setNewIds(new Set()), 10_000);
      setScanTime(new Date().toLocaleTimeString());
      if (!source || source === "NONE") setSource("STREAM");
      return next;
    });
    if (soundRef.current.gems !== "off" && freshGems.length > 0) playSound(soundRef.current.gems);
    // Push notifications for newly detected high-tier gems
    freshGems
      .filter(g => g.tier === "S_TIER" || g.tier === "A_TIER")
      .slice(0, 5)
      .forEach(g => {
        pushNotification({
          kind:     "gem",
          severity: g.tier === "S_TIER" ? "success" : "info",
          title:    `New ${g.tier.replace("_", "-")} gem · $${g.sym}`,
          body:     `Score ${g.score}${g.kol > 0 ? ` · ${g.kol} KOL${g.kol > 1 ? "s" : ""}` : ""}`,
          tab:      "gems",
          meta:     { mint: g.contractAddress },
        });
      });
    stream.clear();
    // Auto-snipe newly detected gems if enabled
    const cfg = asRef.current;
    if (cfg.enabled && freshGems.length) {
      const amt = parseFloat(cfg.amount);
      if (Number.isFinite(amt) && amt > 0) {
        freshGems
          .filter(g => g.score >= cfg.minScore && !asSniped.current.has(g.contractAddress))
          .forEach(g => {
            asSniped.current.add(g.contractAddress);
            // Use internal trading wallet if unlocked, otherwise fall back to server-side API
            const currentIw = iwRef.current;
            const effectiveMethod = currentIw.status === "unlocked" ? "local" : cfg.method;
            autoSnipe({ mint: g.contractAddress, amount: amt, method: effectiveMethod })
              .then((res: AutoSnipeResult) => {
                setAsLog(l => [{ mint: g.contractAddress, sym: g.sym, sig: res.signature, ts: Date.now() }, ...l].slice(0, 50));
              })
              .catch((err: Error) => {
                setAsLog(l => [{ mint: g.contractAddress, sym: g.sym, err: err.message, ts: Date.now() }, ...l].slice(0, 50));
              });
          });
      }
    }
  }, [stream.newGems]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh balance ─────────────────────────────────────────
  useEffect(() => {
    if (!wallet) return;
    fetchBalance(wallet).then(sol => {
      if (sol !== null) setWBal(sol.toFixed(3));
    }).catch(() => {});
  }, [wallet]);

  // ── Manual scan ─────────────────────────────────────────────
  const doScan = useCallback(async () => {
    setLoading(true); setScanMsg("Scanning Solana...");
    try {
      const res = await scan(6);
      if (res.gems.length) {
        const known = new Set(gems.map(g => g.id));
        const ns = new Set<string>();
        res.gems.forEach(g => { if (!known.has(g.id)) ns.add(g.id); });
        setNewIds(ns);
        if (newIdsTimer.current) clearTimeout(newIdsTimer.current);
        newIdsTimer.current = setTimeout(() => setNewIds(new Set()), 10_000);
        setGems(res.gems);
        setScanTime(new Date().toLocaleTimeString());
        setSource(res.source);
      } else if (res.error) {
        setScanMsg(`Scan failed: ${res.error}`);
        await new Promise(r => setTimeout(r, 2500));
      }
    } catch (e) {
      setScanMsg(`Scan failed: ${e instanceof Error ? e.message : String(e)}`);
      await new Promise(r => setTimeout(r, 2500));
    }
    setLoading(false); setScanMsg("");
  }, [gems]);

  useEffect(() => { doScan(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);


  // ── Filtered gems ───────────────────────────────────────────
  const filtered = useMemo(() => gems.filter(g => {
    if (g.score < filters.minScore) return false;
    if (filters.tiers.length && !filters.tiers.includes(g.tier)) return false;
    if (filters.hasKol && g.kol === 0) return false;
    if (filters.noFlags && g.redFlags?.length > 0) return false;
    return true;
  }), [gems, filters]);

  const toggleTier = (t: string) => setFilters(f => ({ ...f, tiers: f.tiers.includes(t) ? f.tiers.filter(x => x !== t) : [...f.tiers, t] }));

  // ── Token launch ────────────────────────────────────────────
  const launchToken = async () => {
    if (!ct.name || !ct.sym) { setCtMsg("Fill Name & Symbol"); return; }
    if (ctJitoMode !== "server" && !wallet) { setCtMsg("Connect Phantom first"); return; }
    if (!ctJito && !wallet) { setCtMsg("Connect Phantom first"); return; }

    setCtLoad(true);
    setCtMsg("");
    try {
      if (ctJito) {
        // ── Jito Bundle path ──────────────────────────────────────
        setCtMsg("Uploading metadata…");
        const devBuySol = parseFloat(ct.devBuy) || 0;
        const tipSol    = parseFloat(ctTip) || 0.003;

        const result = await jitoLaunchBundle({
          name:        ct.name,
          symbol:      ct.sym,
          description: ct.desc || ct.name,
          devBuySol,
          tipSol,
          file:        ctFile ?? undefined,
          wallet:      ctJitoMode === "phantom" ? wallet : undefined,
          server:      ctJitoMode === "server",
        });

        if (result.mode === "server") {
          setCtMsg(`Bundle ${result.bundleId.slice(0, 18)}… | ${result.mintPubkey.slice(0, 12)}…`);
          setCtMintAddress(result.mintPubkey);
          setCtStep("done");
          setCtLoad(false);
          return;
        }

        // Phantom mode — Phantom signs create tx (mint keypair already pre-signed it)
        const hasBuy = devBuySol > 0 && result.buyTxB64;
        const txsToSign: Uint8Array[] = [new Uint8Array(Buffer.from(result.createTxB64, "base64"))];
        if (hasBuy) txsToSign.push(new Uint8Array(Buffer.from(result.buyTxB64, "base64")));

        setCtMsg(`Sign in Phantom (${txsToSign.length} tx${txsToSign.length > 1 ? "s" : ""})…`);
        const signedB64s = await signAllWithPhantom(txsToSign);
        const [phantomCreateB64, signedBuyB64] = signedB64s;

        // createTx already has mint sig — Phantom added its sig; no further signing needed
        setCtMsg("Submitting Jito bundle…");
        const txsForBundle = hasBuy
          ? [phantomCreateB64, signedBuyB64]
          : [phantomCreateB64];
        const { bundleId } = await jitoSubmit(txsForBundle, tipSol);
        setCtMsg(`Bundle ${bundleId.slice(0, 18)}… | ${result.mintPubkey.slice(0, 12)}…`);
        setCtMintAddress(result.mintPubkey);
        setCtStep("done");
      } else {
        // ── Standard Phantom path (no Jito) ──────────────────────
        setCtMsg("Uploading metadata…");
        const form = new FormData();
        form.append("name", ct.name);
        form.append("symbol", ct.sym.toUpperCase());
        form.append("description", ct.desc || ct.name);
        form.append("showName", "true");
        if (ctFile) form.append("file", ctFile, ctFile.name);
        else if (ct.img) form.append("imageUrl", ct.img);
        const meta = await pumpIpfs(form);

        setCtMsg("Building transaction…");
        const mintKp = Keypair.generate();
        const bytes  = await pumpTradeTx({
          publicKey:  wallet,
          action:     "create",
          mint:       mintKp.publicKey.toBase58(),
          amount:     parseFloat(ct.devBuy) || 0,
          slippage:   10,
          priorityFee: 0.0005,
          pool:       "pump",
          tokenMetadata: { name: ct.name, symbol: ct.sym.toUpperCase(), uri: meta.metadataUri },
        });
        const tx = VersionedTransaction.deserialize(bytes);
        tx.sign([mintKp]);
        setCtMsg("Sign in Phantom…");
        const sig = await signAndSendBytes(tx.serialize());
        setCtMintAddress(mintKp.publicKey.toBase58());
        setCtMsg(`TX: ${sig.slice(0, 18)}…`);
        setCtStep("done");
      }
    } catch (e) {
      setCtMsg("Error: " + (e instanceof Error ? e.message : String(e)));
    }
    setCtLoad(false);
  };

  // ── Referral setup ──────────────────────────────────────────
  useEffect(() => {
    setRefLink(`${window.location.origin}/?ref=${refCode}`);
    // Store ?ref= from URL if we were referred
    const params = new URLSearchParams(window.location.search);
    const inRef = params.get("ref");
    if (inRef && inRef !== refCode && /^[1-9A-HJ-NP-Za-km-z]{6,10}$/.test(inRef)) {
      try { localStorage.setItem("geass_ref", inRef); } catch {}
      fetch("/api/referral/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inRef }),
      }).catch(() => {});
      const u = new URL(window.location.href);
      u.searchParams.delete("ref");
      window.history.replaceState({}, "", u.toString());
    }
    // Load own stats
    fetch(`/api/referral/track?code=${refCode}`)
      .then(r => r.json())
      .then(d => setRefStats(d as { clicks: number; referrals: number }))
      .catch(() => {});
  }, [refCode]);

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink).catch(() => {});
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };

  // Load / persist sound prefs
  useEffect(() => {
    try {
      const sg = localStorage.getItem("geass_soundid_gems");
      const sk = localStorage.getItem("geass_soundid_kol");
      const sm = localStorage.getItem("geass_soundid_meme");
      const sc = localStorage.getItem("geass_soundid_community");
      const sa = localStorage.getItem("geass_soundid_geass");
      const ids = SOUND_OPTIONS.map(o => o.id);
      if (sg && ids.includes(sg as SoundId)) setGemSoundId(sg as SoundId);
      if (sk && ids.includes(sk as SoundId)) setKolSoundId(sk as SoundId);
      if (sm && ids.includes(sm as SoundId)) setMemeSoundId(sm as SoundId);
      if (sc && ids.includes(sc as SoundId)) setCommunitySoundId(sc as SoundId);
      if (sa && ids.includes(sa as SoundId)) setGeassAlertSoundId(sa as SoundId);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("geass_soundid_gems",      gemSoundId);
      localStorage.setItem("geass_soundid_kol",       kolSoundId);
      localStorage.setItem("geass_soundid_meme",      memeSoundId);
      localStorage.setItem("geass_soundid_community", communitySoundId);
      localStorage.setItem("geass_soundid_geass",     geassAlertSoundId);
    } catch {}
  }, [gemSoundId, kolSoundId, memeSoundId, communitySoundId, geassAlertSoundId]);

  // Real-time price + signal push from Elixir signal server (falls back to polling if not configured)
  useSignalSocket({
    onPrice: ({ price, change }) => {
      if (price) setSolPrice(price);
      setSolChange(change ?? 0);
    },
    onMeme: ({ signals }) => {
      setMemeSignals(signals as MemeSignal[]);
    },
    onXSignals: ({ signals }) => {
      setXSignals(signals as XSignal[]);
    },
  });

  useEffect(() => {
    const load = () => fetch("/api/sol-price").then(r => r.json()).then((d: { price: number | null; change: number }) => {
      if (d.price) setSolPrice(d.price);
      setSolChange(d.change ?? 0);
    }).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  // DEX Screener search (debounced 350ms)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQ.trim() || searchQ.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(() => {
      fetch(`/api/dex/search?q=${encodeURIComponent(searchQ)}`)
        .then(r => r.json())
        .then((d: { pairs: typeof searchResults }) => setSearchResults(d.pairs ?? []))
        .catch(() => {});
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // KOL sound trigger
  const prevKolCount = useRef(0);
  useEffect(() => {
    if (feedTrades.length > prevKolCount.current && prevKolCount.current > 0) {
      if (soundRef.current.kol !== "off") playSound(soundRef.current.kol);
    }
    prevKolCount.current = feedTrades.length;
  }, [feedTrades.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Meme signal sound trigger — fires when high-score signals arrive
  const prevMemeCount = useRef(0);
  useEffect(() => {
    const highScore = memeSignals.filter(s => s.score >= 60).length;
    if (highScore > prevMemeCount.current && prevMemeCount.current >= 0) {
      if (soundRef.current.meme !== "off") playSound(soundRef.current.meme);
    }
    prevMemeCount.current = highScore;
  }, [memeSignals]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Portfolio ───────────────────────────────────────────────
  const loadPortfolio = useCallback(async () => {
    setPortfolioLoading(true); setPortfolioErr("");
    try { setPortfolio(await fetchPortfolio(wallet)); }
    catch (e) { setPortfolioErr(e instanceof Error ? e.message : String(e)); }
    setPortfolioLoading(false);
  }, [wallet]);

  useEffect(() => {
    if (tab === "pro" && pro.active && !portfolio && !portfolioLoading) loadPortfolio();
  }, [tab, pro.active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== "trending" && tab !== "home") return;
    setTrendingLoading(true);
    fetchTrending().then(d => {
      setTrendingTokens(d.tokens);
      setTrendingMetas(d.metas);
    }).finally(() => setTrendingLoading(false));
    setMemeLoading(true);
    fetchMemeSignals().then(d => { setMemeSignals(d.signals); setMemeNarratives(d.narratives ?? []); }).finally(() => setMemeLoading(false));
    setXLoading(true);
    fetchXSignals().then(d => setXSignals(d.signals)).finally(() => setXLoading(false));
  }, [tab]);

  // Auto-refresh news every 60s on home and trending tabs
  useEffect(() => {
    if (tab !== "home" && tab !== "trending") return;
    const id = setInterval(() => {
      fetchXSignals().then(d => setXSignals(d.signals)).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [tab]);

  // ── Stream status ───────────────────────────────────────────
  const detecting = stream.detecting;
  const streamConnected = stream.connected;
  const streamReconnecting = stream.reconnecting;
  const streamAttempt = stream.attempt;
  const streamNextRetryAt = stream.nextRetryAt;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!streamReconnecting) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [streamReconnecting]);
  const retryInSec = streamNextRetryAt ? Math.max(0, Math.ceil((streamNextRetryAt - now) / 1000)) : 0;

  let statusLabel: string;
  let statusColor: string;
  if (streamConnected) {
    statusLabel = detecting ? "DETECTING" : "LIVE";
    statusColor = "#10b981";
  } else if (streamReconnecting) {
    statusLabel = retryInSec > 0 ? `RECONNECTING #${streamAttempt} · ${retryInSec}s` : `RECONNECTING #${streamAttempt}`;
    statusColor = "#eab308";
  } else {
    statusLabel = "OFFLINE";
    statusColor = "#ef4444";
  }

  // ── Sidebar content ─────────────────────────────────────────
  const sidebarContent = (
    <>
      {/* Header */}
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: sidebarCollapsed ? "0 10px" : "0 14px", borderBottom: "1px solid #18181c", gap: 8, flexShrink: 0, overflow: "hidden" }}>
        <button onClick={() => { setTab("home" as typeof tab); }} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, flex: 1, minWidth: 0 }}>
          <div style={{ filter: "drop-shadow(0 0 6px rgba(255,43,78,0.35))", display: "flex" }}>
            <GeassLogo size={28} />
          </div>
          {!sidebarCollapsed && (
            <div style={{ overflow: "hidden" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#f5f5f7", letterSpacing: "3px" }}>GEASS</span>
              <div style={{ fontSize: 8, color: "#34343a", letterSpacing: "2px", marginTop: -1, fontFamily: MONO }}>ALPHA_RECON</div>
            </div>
          )}
        </button>
        {isMobile ? (
          <button onClick={() => setSidebarOpen(false)} aria-label="Close menu"
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#52525b", cursor: "pointer", lineHeight: 1, padding: 4, display: "flex" }}>
            <IconX size={16} />
          </button>
        ) : (
          <button onClick={() => setSidebarCollapsed(v => !v)} aria-label="Collapse sidebar"
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid #18181c", color: "#5a5a63", width: 22, height: 22, borderRadius: 0, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: MONO }}>
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
        {NAV.filter(n => !n.mobileOnly && !n.sidebarHidden).map(n => {
          const isActive = tab === n.id;
          const accent = n.pro ? "#8b5cf6" : "#ff2b4e";
          const hasSub = !!n.sub?.length;
          const expanded = hasSub && settingsOpen && !sidebarCollapsed;

          return (
            <div key={n.id}>
              <button
                onClick={() => {
                  if (hasSub && !sidebarCollapsed) { setSettingsOpen(v => !v); return; }
                  if (hasSub && sidebarCollapsed) {
                    setTab(n.id as typeof tab);
                    setSettingsSection(null);
                    setSidebarOpen(false);
                    return;
                  }
                  setTab(n.id as typeof tab);
                  setSidebarOpen(false);
                  if (n.id !== "settings") setSettingsOpen(false);
                }}
                title={sidebarCollapsed ? n.label : undefined}
                className="nav-item"
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: sidebarCollapsed ? 0 : 10,
                  padding: sidebarCollapsed ? "9px 0" : "9px 10px",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  borderRadius: 0,
                  border: "1px solid transparent",
                  borderLeft: !sidebarCollapsed && isActive ? `2px solid ${accent}` : "2px solid transparent",
                  background: isActive ? "#0d0d10" : "transparent",
                  color: isActive ? accent : n.pro ? "#6d4aab" : "#5a5a63",
                  cursor: "pointer", marginBottom: 2,
                  fontSize: 11, fontWeight: isActive ? 700 : 500, textAlign: "left",
                  fontFamily: MONO, letterSpacing: ".3px",
                }}>
                <NavIcon id={n.iconId} size={sidebarCollapsed ? 16 : 14} />
                {!sidebarCollapsed && (
                  <>
                    <span style={{ flex: 1 }}>{n.label}</span>
                    {n.badge && (
                      <span style={{ fontSize: 7, fontWeight: 700, fontFamily: MONO,
                        color: n.badge === "NEW" ? "#10b981" : n.pro ? "#8b5cf6" : "#10b981",
                        border: `1px solid ${(n.badge === "NEW" ? "#10b981" : n.pro ? "#8b5cf6" : "#10b981") + "35"}`,
                        padding: "1px 6px", borderRadius: 0, letterSpacing: "1px" }}>
                        {n.badge}
                      </span>
                    )}
                    {hasSub && (
                      <span style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s", display: "flex" }}>
                        <IconChevronDown size={12} />
                      </span>
                    )}
                  </>
                )}
              </button>
              {expanded && n.sub && (
                <div style={{ marginLeft: 16, marginBottom: 4, borderLeft: "1px solid #18181c", paddingLeft: 8 }}>
                  {n.sub.map(s => {
                    const subActive = tab === "settings" && settingsSection === s.id;
                    return (
                      <button key={s.id}
                        onClick={() => {
                          const override = SETTINGS_TAB_OVERRIDES[s.id];
                          if (override) {
                            setTab(override as typeof tab);
                          } else {
                            setTab("settings" as typeof tab);
                            setSettingsSection(s.id);
                          }
                          setSidebarOpen(false);
                        }}
                        style={{
                          width: "100%", padding: "6px 10px", borderRadius: 0,
                          background: subActive ? "#0d0d10" : "transparent",
                          border: "none", color: subActive ? "#ff2b4e" : "#5a5a63",
                          fontSize: 10, fontWeight: subActive ? 700 : 500, textAlign: "left",
                          cursor: "pointer", marginBottom: 1, fontFamily: MONO,
                        }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: sidebarCollapsed ? "8px 4px" : 8, borderTop: "1px solid #18181c", display: "flex", flexDirection: "column", gap: 6 }}>
        {!sidebarCollapsed && pro.active && (
          <div style={{ padding: "5px 10px", background: "#8b5cf612", border: "1px solid #8b5cf640", borderRadius: 0, fontSize: 9, color: "#8b5cf6", fontWeight: 700, letterSpacing: ".5px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: MONO }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <IconCrown size={11} /> PRO ACTIVE
            </span>
            {pro.expiresAt && <span style={{ fontWeight: 500, opacity: .7 }}>{Math.max(0, Math.ceil((pro.expiresAt - Date.now()) / 86_400_000))}d</span>}
          </div>
        )}
        {!sidebarCollapsed && (
          <div style={{ padding: "6px 10px", background: "#10b98110", border: "1px solid #10b98130", borderRadius: 0, fontSize: 9, color: "#10b981", display: "flex", alignItems: "center", gap: 5, fontFamily: MONO }}>
            <IconCheck size={10} />
            <span>{shortAddr(wallet)}{wBal ? ` · ${wBal} SOL` : ""}</span>
          </div>
        )}
        {!sidebarCollapsed && iw.status !== "none" && (
          <div
            onClick={() => { setTab("settings" as typeof tab); setSettingsSection("wallet"); setSidebarOpen(false); }}
            style={{ padding: "6px 10px", background: iw.status === "unlocked" ? "#3b82f610" : "#0d0d10", border: `1px solid ${iw.status === "unlocked" ? "#3b82f640" : "#18181c"}`, borderRadius: 0, fontSize: 9, color: iw.status === "unlocked" ? "#3b82f6" : "#5a5a63", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: MONO }}>
            <IconWallet size={10} />
            <span>
              {iw.status === "unlocked"
                ? `${shortAddr(iw.publicKey ?? "")} · ${iw.balance?.toFixed(3) ?? "…"} SOL`
                : `Trading Wallet locked`}
            </span>
          </div>
        )}
        {!isMobile && (
          <button onClick={() => setProfilePanelOpen(v => !v)} title="Toggle profile panel"
            style={{ width: "100%", padding: sidebarCollapsed ? "6px" : "6px 8px", borderRadius: 7, border: `1px solid ${profilePanelOpen ? "#27272a50" : "#27272a"}`, background: profilePanelOpen ? "#27272a30" : "transparent", color: profilePanelOpen ? "#a1a1aa" : "#52525b", fontSize: 9, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <IconUser size={12} />
            {!sidebarCollapsed && (profilePanelOpen ? "Hide Profile" : "Profile")}
          </button>
        )}
        <button onClick={onDisconnect} title="Disconnect"
          style={{ width: "100%", padding: sidebarCollapsed ? "6px" : "6px 8px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 9, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <IconPower size={12} />
          {!sidebarCollapsed && "Disconnect"}
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100dvh", background: "#000", color: "#f5f5f7", fontFamily: "'Inter',system-ui,sans-serif", overflow: "hidden", position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: APP_CSS }} />

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "#000000a0", zIndex: 40, backdropFilter: "blur(2px)" }} />
      )}

      {/* Sidebar — desktop: always visible; mobile: drawer */}
      {!isMobile ? (
        <aside style={{ width: sidebarCollapsed ? 52 : 200, background: "#08080d", borderRight: "1px solid #151520", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .2s ease" }}>
          {sidebarContent}
        </aside>
      ) : (
        <aside style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 230, background: "#08080d", borderRight: "1px solid #151520",
          display: "flex", flexDirection: "column", zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .25s ease",
        }}>
          {sidebarContent}
        </aside>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ height: 50, background: "#08080d", borderBottom: "1px solid #151520", display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu"
              style={{ background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", width: 32, height: 32, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconMenu size={16} />
            </button>
            <div style={{ filter: "drop-shadow(0 0 5px rgba(244,63,94,0.3))", display: "flex" }}>
              <GeassLogo size={22} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "1.5px", background: "linear-gradient(90deg,#f4f4f5,#a1a1aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GEASS</span>
            {solPrice && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <IconSolana size={12} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>${solPrice.toFixed(2)}</span>
                {solChange !== 0 && <span style={{ fontSize: 9, color: solChange >= 0 ? "#10b981" : "#ef4444" }}>{solChange >= 0 ? "+" : ""}{solChange.toFixed(1)}%</span>}
              </div>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {streamConnected && <div className="live-dot" style={{ background: statusColor }} />}
              <span style={{ fontSize: 8, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
              <NotificationsBell isMobile onNavigate={t => setTab(t as typeof tab)} />
            </div>
          </div>
        )}

        {/* Ticker + SOL price strip — always visible */}
        {gems.length > 0 && (
          <div style={{ height: 32, borderBottom: "1px solid #18181b", background: "#0a0a0c", display: "flex", alignItems: "center", overflow: "hidden", flexShrink: 0, gap: 0 }}>
            {/* SOL price — desktop only */}
            {!isMobile && solPrice && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRight: "1px solid #18181b", flexShrink: 0, height: "100%" }}>
                <IconSolana size={14} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#f4f4f5" }}>${solPrice.toFixed(2)}</span>
                {solChange !== 0 && <span style={{ fontSize: 9, color: solChange >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{solChange >= 0 ? "+" : ""}{solChange.toFixed(1)}%</span>}
              </div>
            )}
            {/* Scrolling coin ticker */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <div className="ticker-track">
                {[...gems, ...gems].map((g, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", fontSize: 10, color: "#52525b", cursor: "pointer", flexShrink: 0 }}
                    onClick={() => setSnipeGem(g)}>
                    <span style={{ fontWeight: 700, color: g.tier === "S_TIER" ? "#10b981" : g.tier === "A_TIER" ? "#3b82f6" : "#eab308" }}>${g.sym}</span>
                    <span style={{ color: "#3f3f46" }}>{g.score}pts</span>
                    {g.kol > 0 && <span style={{ color: "#a855f7", fontSize: 8 }}>KOL</span>}
                    <span style={{ color: "#27272a" }}>·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Multifunctional Search bar */}
        <div style={{ padding: isMobile ? "8px 12px" : "8px 18px", borderBottom: "1px solid #18181b", background: "#0c0c0e", flexShrink: 0, position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 600, flex: 1 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#52525b", pointerEvents: "none", display: "flex" }}>
                <IconSearch size={12} />
              </span>
              <input
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 300)}
                placeholder={
                  searchCategory === "tokens"  ? "Search token name, symbol or mint…" :
                  searchCategory === "kol"     ? "Search KOL name or @handle…" :
                  searchCategory === "wallets" ? "Paste Solana wallet address…" :
                  "Search tokens, KOL traders, wallets…"
                }
                style={{ width: "100%", background: "#111113", border: "1px solid #27272a", borderRadius: 9, color: "#f4f4f5", padding: "7px 30px 7px 30px", fontSize: 11, outline: "none", transition: "border .15s", boxSizing: "border-box" }}
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(""); setSearchResults([]); }} aria-label="Clear"
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#52525b", cursor: "pointer", display: "flex", padding: 2 }}>
                  <IconX size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Notifications bell — desktop only (mobile has it in top bar) */}
          {!isMobile && (
            <NotificationsBell onNavigate={t => setTab(t as typeof tab)} />
          )}

          {/* Unified search dropdown */}
          {searchOpen && searchQ.length >= 2 && (kolMatches.length > 0 || searchResults.length > 0 || isSolanaAddress(searchQ)) && (
            <div style={{ position: "absolute", top: "calc(100% + 2px)", left: isMobile ? 12 : 18, right: isMobile ? 12 : 18, maxWidth: 600, background: "#111113", border: "1px solid #27272a", borderRadius: 12, zIndex: 200, overflow: "hidden", boxShadow: "0 12px 40px #00000090" }}>

              {/* KOL section */}
              {(searchCategory === "all" || searchCategory === "kol") && kolMatches.length > 0 && (
                <>
                  <div style={{ padding: "6px 12px 3px", fontSize: 8, fontWeight: 700, color: "#52525b", letterSpacing: "1px" }}>KOL TRADERS</div>
                  {kolMatches.map(k => (
                    <button key={k.addr} onMouseDown={() => { window.open(`https://x.com/${k.tw}`, "_blank"); setSearchOpen(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "transparent", border: "none", borderBottom: "1px solid #18181b", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `1px solid ${k.c}50`, flexShrink: 0, background: k.c + "25" }}>
                        <img src={`https://unavatar.io/twitter/${k.tw}`} alt={k.name} width={26} height={26} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>{k.name}</div>
                        <div style={{ fontSize: 9, color: "#52525b", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{k.tw} · {k.addr.slice(0,8)}…</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>{k.pnl}</div>
                        <div style={{ fontSize: 9, color: "#52525b" }}>{k.wr}% WR</div>
                      </div>
                      <span style={{ fontSize: 9, color: "#3b82f6", flexShrink: 0 }}>X ↗</span>
                    </button>
                  ))}
                </>
              )}

              {/* CA / address section */}
              {(searchCategory === "all" || searchCategory === "wallets") && isSolanaAddress(searchQ) && (
                <>
                  <div style={{ padding: "6px 12px 3px", fontSize: 8, fontWeight: 700, color: "#52525b", letterSpacing: "1px" }}>CONTRACT ADDRESS</div>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #18181b" }}>
                    <div style={{ fontSize: 9, color: "#3f3f46", fontFamily: "monospace", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{searchQ.trim()}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onMouseDown={() => { scanCA(searchQ.trim()); }}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid #ff2b4e55", background: "#ff2b4e12", color: "#ff2b4e", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em" }}>
                        {caScoreLoading ? "Scanning…" : "Scan Token"}
                      </button>
                      <button onMouseDown={() => { window.open(`https://solscan.io/token/${searchQ.trim()}`, "_blank"); setSearchOpen(false); }}
                        style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 10, cursor: "pointer" }}>
                        Solscan ↗
                      </button>
                    </div>
                    {caScore && (
                      <div style={{ marginTop: 8, padding: "8px 10px", background: "#0a0a0c", borderRadius: 8, border: "1px solid #1e1e24" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#f4f4f5" }}>{caScore.sym}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                            background: caScore.tier === "ALERT" ? "#ff2b4e22" : caScore.tier === "S" ? "#10b98122" : "#3b82f622",
                            color: caScore.tier === "ALERT" ? "#ff2b4e" : caScore.tier === "S" ? "#10b981" : "#3b82f6",
                            border: `1px solid ${caScore.tier === "ALERT" ? "#ff2b4e44" : caScore.tier === "S" ? "#10b98144" : "#3b82f644"}` }}>
                            {caScore.tier}
                          </span>
                          <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 800, color: "#f4f4f5" }}>{caScore.total}</span>
                        </div>
                        {caScore.signals.slice(0,3).map((s, i) => (
                          <div key={i} style={{ fontSize: 9, color: "#71717a", marginTop: 2 }}>· {s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Token section */}
              {(searchCategory === "all" || searchCategory === "tokens") && searchResults.length > 0 && (
                <>
                  <div style={{ padding: "6px 12px 3px", fontSize: 8, fontWeight: 700, color: "#52525b", letterSpacing: "1px" }}>TOKENS</div>
                  {searchResults.slice(0, 6).map((p, i) => {
                    const ch24 = p.priceChange?.h24;
                    return (
                      <button key={i} onMouseDown={() => { setDexToken({ address: p.baseToken.address, symbol: p.baseToken.symbol }); setSearchQ(""); setSearchResults([]); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "transparent", border: "none", borderBottom: "1px solid #18181b", cursor: "pointer", textAlign: "left" }}>
                        {p.info?.imageUrl ? (
                          <img src={p.info.imageUrl} alt={p.baseToken.symbol} width={26} height={26} style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#71717a", flexShrink: 0 }}>{p.baseToken.symbol.slice(0,2)}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#f4f4f5" }}>${p.baseToken.symbol}</span>
                            <span style={{ fontSize: 9, color: "#52525b" }}>{p.baseToken.name}</span>
                          </div>
                          <div style={{ fontSize: 9, color: "#3f3f46", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.baseToken.address}</div>
                        </div>
                        {p.priceUsd && <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5", flexShrink: 0 }}>${parseFloat(p.priceUsd) < 0.0001 ? parseFloat(p.priceUsd).toExponential(2) : parseFloat(p.priceUsd).toFixed(6)}</span>}
                        {ch24 !== undefined && ch24 !== null && <span style={{ fontSize: 10, fontWeight: 600, color: ch24 >= 0 ? "#10b981" : "#ef4444", flexShrink: 0 }}>{ch24 >= 0 ? "+" : ""}{ch24.toFixed(1)}%</span>}
                        <span style={{ fontSize: 9, color: "#f97316", flexShrink: 0 }}>DEX ↗</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <main style={{ flex: 1, overflow: "auto" }}>
          {snipeGem && <SnipeModal gem={snipeGem} wallet={wallet} onClose={() => setSnipeGem(null)} />}
          {jupModal && (
            <JupiterSwapModal
              wallet={wallet}
              mint={jupModal.mint}
              symbol={jupModal.symbol}
              mode={jupModal.mode}
              onClose={() => setJupModal(null)}
            />
          )}
          {dexToken && (
            <TokenModal
              address={dexToken.address}
              symbol={dexToken.symbol}
              onClose={() => setDexToken(null)}
              onSnipe={(addr, sym) => {
                setDexToken(null);
                setSnipeGem({ contractAddress: addr, sym, name: sym, score: 0, tier: "B_TIER", mcap: 0, xPotential: 0, kol: 0, mintRev: false, freezeRev: false, holders: 0, reasons: [], redFlags: [], kolBuyers: [], id: addr } as unknown as Gem);
              }}
            />
          )}

          {/* ALPHA SCANNER TAB */}
          {tab === "gems" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", letterSpacing: ".3px", display: "flex", alignItems: "center", gap: 8 }}>
                  <IconZap size={isMobile ? 16 : 18} /> Alpha Scanner
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                  {streamConnected && <div className="live-dot" style={{ background: detecting ? "#10b981" : "#10b98180" }} />}
                  <span style={{ fontSize: 9, color: statusColor, fontWeight: streamReconnecting ? 700 : 500 }}>{statusLabel}</span>
                  {scanTime && <span style={{ fontSize: 9, color: "#3f3f46" }}>· {scanTime}</span>}
                  {source && <span style={{ fontSize: 9, color: "#27272a" }}>· {source}</span>}
                </div>
              </div>
              {!isMobile && <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 16 }}>Real-time detection · Helius pump.fun + DexScreener · Server-side scan, SSE push</p>}

              {/* Filters */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <div style={{ minWidth: 130 }}>
                    <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
                      <span>MIN SCORE</span><span style={{ color: "#10b981", fontWeight: 700 }}>{filters.minScore}</span>
                    </div>
                    <input type="range" min={0} max={90} step={5} value={filters.minScore}
                      onChange={e => setFilters(f => ({ ...f, minScore: +e.target.value }))} style={{ width: "100%" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5 }}>TIER</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {["S_TIER", "A_TIER", "B_TIER"].map(t => {
                        const tm = TIER[t]; const a = filters.tiers.includes(t);
                        return <button key={t} onClick={() => toggleTier(t)} style={{ padding: "3px 9px", borderRadius: 5, fontSize: 9, fontWeight: 700, cursor: "pointer", border: `1px solid ${a ? tm.c : "#27272a"}`, background: a ? tm.c + "18" : "transparent", color: a ? tm.c : "#52525b" }}>{tm.l}</button>;
                      })}
                    </div>
                  </div>
                  {([["hasKol", "Has KOL"], ["noFlags", "Safe Only"]] as [keyof typeof filters, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setFilters(f => ({ ...f, [k]: !f[k] }))}
                      style={{ padding: "5px 10px", borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${filters[k] ? "#dc2626" : "#27272a"}`,
                        background: filters[k] ? "#dc262612" : "transparent",
                        color: filters[k] ? "#ef4444" : "#52525b" }}>
                      {filters[k] ? <IconCheck size={10} /> : "+"} {l}
                    </button>
                  ))}
                  <button onClick={doScan} disabled={loading}
                    style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: loading ? "wait" : "pointer", background: loading ? "#111" : "#dc2626", color: "#fff", border: "none", letterSpacing: ".5px" }}>
                    {loading
                      ? <span className="pulse" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconRefresh size={12} /> Scanning...</span>
                      : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconRefresh size={12} /> SCAN NOW</span>}
                  </button>
                </div>
              </div>

              {scanMsg && <div className="pulse" style={{ textAlign: "center", fontSize: 10, color: "#dc262680", marginBottom: 10 }}>{scanMsg}</div>}

              {/* Stats */}
              <div className="app-g4" style={{ marginBottom: 14 }}>
                {[
                  { l: "S-Tier",     v: gems.filter(g => g.tier === "S_TIER").length, c: "#10b981" },
                  { l: "A-Tier",     v: gems.filter(g => g.tier === "A_TIER").length, c: "#3b82f6" },
                  { l: "KOL Backed", v: gems.filter(g => g.kol > 0).length,           c: "#a855f7" },
                  { l: "Detected",   v: gems.length,                                  c: "#ef4444" },
                ].map(s => (
                  <div key={s.l} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 8, padding: isMobile ? "8px 10px" : "10px 12px" }}>
                    <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: isMobile ? 8 : 10, color: "#3f3f46", marginTop: 1 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Grid */}
              {!pro.active ? (
                <div style={{ position: "relative" }}>
                  {/* Blurred preview of all tokens */}
                  {gems.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12, filter: "blur(8px)", pointerEvents: "none", userSelect: "none", opacity: 0.35 }}>
                      {filtered.slice(0, 6).map(g => <GemCard key={g.id} gem={g} isNew={false} onSnipe={() => {}} />)}
                    </div>
                  )}
                  {/* Full-grid lock overlay */}
                  <div style={{ position: gems.length > 0 ? "absolute" : "relative", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: gems.length === 0 ? "60px 20px" : 0, minHeight: gems.length === 0 ? 260 : undefined }}>
                    <div style={{ background: "linear-gradient(135deg,#14101f,#0d0d12)", border: "1px solid #7c3aed60", borderRadius: 20, padding: "32px 40px", textAlign: "center", backdropFilter: "blur(12px)", boxShadow: "0 0 60px #7c3aed20" }}>
                      <div style={{ color: "#7c3aed", marginBottom: 10, display: "flex", justifyContent: "center" }}><IconLock size={40} /></div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f5", marginBottom: 6 }}>Alpha Scanner — Pro Only</div>
                      <div style={{ fontSize: 12, color: "#71717a", marginBottom: 8, lineHeight: 1.6, maxWidth: 280 }}>
                        {gems.length > 0
                          ? <><span style={{ color: "#ef4444", fontWeight: 700 }}>{filtered.length} signals</span> detected right now. Unlock real-time access with GEASS Pro.</>
                          : "Real-time token detection powered by Helius + DexScreener. Requires GEASS Pro."}
                      </div>
                      <div style={{ fontSize: 10, color: "#52525b", marginBottom: 24 }}>Score · Tier · KOL activity · Bonding curve · Safety flags</div>
                      <button onClick={() => setTab("pro" as typeof tab)}
                        style={{ padding: "11px 32px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 0 28px #7c3aed50" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><IconCrown size={14} /> Upgrade to GEASS Pro</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                  {loading && !gems.length && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "50px 20px" }}>
                      <div style={{ color: "#dc2626", display: "inline-block" }} className="spin"><IconRefresh size={18} /></div>
                      <div className="pulse" style={{ fontSize: 11, color: "#dc262680", marginTop: 10, letterSpacing: "2px" }}>SCANNING SOLANA MATRIX...</div>
                    </div>
                  )}
                  {filtered.map(g => <GemCard key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={setSnipeGem} onDex={(addr, sym) => setDexToken({ address: addr, symbol: sym })} onWatch={(mint, sym, name) => watchlist.has(mint) ? watchlist.remove(mint) : watchlist.add({ mint, sym, name })} isWatched={watchlist.has(g.id)} />)}
                  {!loading && gems.length > 0 && filtered.length === 0 && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#3f3f46" }}>
                      <div style={{ color: "#3f3f46", marginBottom: 6, display: "flex", justifyContent: "center" }}><IconSearch size={24} /></div>
                      <div style={{ fontSize: 12 }}>No gems match filters — try lowering Min Score</div>
                    </div>
                  )}
                  {!loading && !gems.length && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#3f3f46" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>⏳</div>
                      <div style={{ fontSize: 12 }}>Waiting for the first signals from pump.fun...</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* HOME TAB */}
          {tab === "home" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <HomeTab
                solPrice={solPrice}
                solChange={solChange}
                feedTrades={feedTrades}
                trendingTokens={trendingTokens}
                memeSignals={memeSignals}
                xSignals={xSignals}
                trendingLoading={trendingLoading}
                isMobile={isMobile}
                onNavigate={(id) => setTab(id as typeof tab)}
              />
            </div>
          )}

          {/* LIVE FEED TAB */}
          {tab === "trades" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 8 }}>
                  <IconBroadcast size={isMobile ? 16 : 18} /> Live KOL Feed
                </h1>
                <div className="live-dot" /><span style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>LIVE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                {KOLS.map(k => {
                  const kTrades = feedTrades.filter(t => t.kol === k.name).slice(0, 6);
                  return (
                    <div key={k.name} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "10px 12px", borderBottom: "1px solid #18181b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: k.c + "25", border: `1px solid ${k.c}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: k.c }}>{k.name[0]}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: "#f4f4f5" }}>{k.name}</div>
                            {k.tw && <div style={{ fontSize: 8, color: "#3f3f46" }}>@{k.tw}</div>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: k.pnl.startsWith("+") ? "#10b981" : "#ef4444" }}>{k.pnl}</div>
                          <div style={{ fontSize: 8, color: "#3f3f46" }}>Win {k.wr}%</div>
                        </div>
                      </div>
                      <div style={{ maxHeight: 160, overflowY: "auto" }}>
                        {kTrades.length === 0
                          ? <div style={{ padding: 14, textAlign: "center", fontSize: 9, color: "#27272a" }}>Waiting...</div>
                          : kTrades.map(t => (
                            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr auto", gap: 3, padding: "4px 10px", borderBottom: "1px solid #111", alignItems: "center", fontSize: 9 }}>
                              <span style={{ fontWeight: 700, color: t.type === "buy" ? "#10b981" : "#ef4444" }}>{t.type === "buy" ? "Buy" : "Sell"}</span>
                              {t.type === "buy"
                                ? <><span style={{ color: "#d4d4d8", fontWeight: 600 }}>{t.sol} <span style={{ color: "#52525b" }}>Sol</span></span><span style={{ color: "#f4f4f5" }}>{t.tokAmt} <span style={{ color: "#10b981", fontWeight: 700 }}>{t.sym}</span></span></>
                                : <><span style={{ color: "#f4f4f5" }}>{t.tokAmt} <span style={{ color: "#ef4444", fontWeight: 700 }}>{t.sym}</span></span><span style={{ color: "#d4d4d8", fontWeight: 600 }}>{t.sol} <span style={{ color: "#52525b" }}>Sol</span></span></>
                              }
                              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                                <span style={{ color: "#3f3f46" }}>{fmtAge(t.ago)}</span>
                                {t.mint && (
                                  <button
                                    onClick={() => setJupModal({ mint: t.mint!, symbol: t.sym, mode: "buy" })}
                                    style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #a855f740", background: "#a855f710", color: "#a855f7", fontSize: 8, fontWeight: 700, cursor: "pointer", lineHeight: 1.4 }}
                                  >
                                    BUY
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LAUNCH TAB */}
          {tab === "launch" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px", maxWidth: 500 }}>
              <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <IconRocket size={isMobile ? 16 : 18} /> Launch Token
              </h1>
              <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 16 }}>Create & launch on Pump.fun · 100% on-chain via Phantom</p>
              <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", marginBottom: 14, background: "#111113", border: "1px solid #10b98130", borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <IconCheck size={10} /> {wallet.slice(0, 16)}...
                  </div>
                  {wBal && <div style={{ fontSize: 9, color: "#3f3f46" }}>{wBal} SOL</div>}
                </div>
                <span style={{ fontSize: 9, color: "#10b98180" }}>Connected</span>
              </div>
              {ctStep === "form" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([["name", "TOKEN NAME *", "Moon Pepe"], ["sym", "SYMBOL *", "MPEPE"]] as [keyof typeof ct, string, string][]).map(([k, l, p]) => (
                      <div key={k}>
                        <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 4 }}>{l}</div>
                        <input value={ct[k]} onChange={e => setCt(pr => ({ ...pr, [k]: e.target.value }))} placeholder={p}
                          style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 7, color: "#f4f4f5", padding: "9px 12px", fontSize: 12, outline: "none" }}
                          onFocus={e => (e.target.style.borderColor = "#dc2626")}
                          onBlur={e => (e.target.style.borderColor = "#27272a")} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 4 }}>DESCRIPTION</div>
                    <textarea value={ct.desc} onChange={e => setCt(p => ({ ...p, desc: e.target.value }))} placeholder="Token description..." rows={3}
                      style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 7, color: "#f4f4f5", padding: "9px 12px", fontSize: 11, outline: "none", resize: "vertical" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 4 }}>IMAGE</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "9px 12px", background: "#09090b", border: `1px solid ${ctFile ? "#10b981" : "#27272a"}`, borderRadius: 7 }}>
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => { setCtFile(e.target.files?.[0] ?? null); setCt(p => ({ ...p, img: "" })); }} />
                      <span style={{ fontSize: 11, color: ctFile ? "#10b981" : "#52525b" }}>{ctFile ? ctFile.name : "Upload file..."}</span>
                      {ctFile && <button onClick={e => { e.preventDefault(); setCtFile(null); }} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>✕</button>}
                    </label>
                    {!ctFile && (
                      <input value={ct.img} onChange={e => setCt(p => ({ ...p, img: e.target.value }))} placeholder="or paste image URL..."
                        style={{ width: "100%", marginTop: 6, background: "#09090b", border: "1px solid #27272a", borderRadius: 7, color: "#f4f4f5", padding: "9px 12px", fontSize: 11, outline: "none" }} />
                    )}
                  </div>
                  <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>DEV BUY (SOL)</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#eab308" }}>{ct.devBuy} SOL</span>
                    </div>
                    <input type="range" min="0" max="5" step="0.1" value={ct.devBuy} onChange={e => setCt(p => ({ ...p, devBuy: e.target.value }))} style={{ width: "100%" }} />
                  </div>
                  {/* Jito Bundle toggle */}
                  <div style={{ background: "#111113", border: `1px solid ${ctJito ? "#7c3aed40" : "#27272a"}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ctJito ? 12 : 0 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: ctJito ? "#a855f7" : "#71717a" }}>Use Jito Bundle <span style={{ fontSize: 8, background: "#10b98120", color: "#10b981", border: "1px solid #10b98140", padding: "1px 5px", borderRadius: 4, marginLeft: 4 }}>RECOMMENDED</span></div>
                        <div style={{ fontSize: 9, color: "#52525b", marginTop: 1 }}>Atomic create + dev buy · anti-MEV · faster landing</div>
                      </div>
                      <button onClick={() => setCtJito(v => !v)}
                        style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: ctJito ? "#a855f7" : "#27272a", transition: "background .2s", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: 2, left: ctJito ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                      </button>
                    </div>
                    {ctJito && (
                      <>
                        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                          {([["phantom", "Phantom signs"], ["server", "GEASS wallet"]] as ["phantom"|"server", string][]).map(([m, l]) => (
                            <button key={m} onClick={() => setCtJitoMode(m)}
                              style={{ flex: 1, padding: "6px 8px", borderRadius: 7, cursor: "pointer", fontSize: 9, fontWeight: 700,
                                border: `1px solid ${ctJitoMode === m ? "#a855f7" : "#27272a"}`,
                                background: ctJitoMode === m ? "#a855f712" : "transparent",
                                color: ctJitoMode === m ? "#a855f7" : "#52525b" }}>{l}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#52525b", marginBottom: 4 }}>
                          <span>JITO TIP</span>
                          <span style={{ color: "#a855f7", fontWeight: 700 }}>{parseFloat(ctTip).toFixed(4)} SOL</span>
                        </div>
                        <input type="range" min="0.001" max="0.01" step="0.0005" value={ctTip}
                          onChange={e => setCtTip(e.target.value)} style={{ width: "100%" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3f3f46", marginTop: 2 }}>
                          <span>0.001 — economical</span><span>0.01 — fastest</span>
                        </div>
                      </>
                    )}
                  </div>

                  {ctMsg && <div style={{ fontSize: 10, color: ctMsg.startsWith("Bundle") || ctMsg.startsWith("Launched") ? "#10b981" : "#f59e0b", textAlign: "center" }}>{ctMsg}</div>}
                  <button onClick={launchToken} disabled={ctLoad || !ct.name || !ct.sym}
                    style={{ background: ctJito ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#dc2626,#7c3aed)", border: "none", color: "#fff", padding: 11,
                      borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: ctLoad ? "wait" : "pointer", letterSpacing: ".5px", opacity: (!ct.name || !ct.sym) ? 0.4 : 1 }}>
                    {ctLoad
                      ? <span className="pulse" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconRefresh size={12} /> Processing...</span>
                      : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconZap size={12} /> {ctJito ? "LAUNCH VIA JITO BUNDLE" : "LAUNCH ON-CHAIN"}</span>}
                  </button>
                </div>
              )}
              {ctStep === "done" && (
                <div style={{ textAlign: "center", padding: "30px 20px", background: "#111113", border: "1px solid #10b98130", borderRadius: 12 }}>
                  <div style={{ color: "#10b981", marginBottom: 10, display: "flex", justifyContent: "center" }}><IconRocket size={48} /></div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981", marginBottom: 6 }}>Token Launched!</div>
                  <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>${ct.sym.toUpperCase()} is live on Pump.fun</div>
                  <div style={{ fontSize: 10, color: "#3f3f46", marginBottom: 10 }}>{ctMsg}</div>
                  {ctMintAddress && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 14, padding: "8px 12px", background: "#0a0a0b", border: "1px solid #27272a", borderRadius: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#52525b", letterSpacing: "1px" }}>CA</span>
                      <span style={{ fontSize: 10, color: "#a1a1aa", fontFamily: "monospace", wordBreak: "break-all" }}>{ctMintAddress}</span>
                      <button onClick={() => navigator.clipboard.writeText(ctMintAddress)}
                        style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", flexShrink: 0, padding: 2 }}
                        title="Copy CA">
                        <IconCopy size={13} />
                      </button>
                    </div>
                  )}
                  {ctMintAddress && (
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
                      <a href={`https://pump.fun/coin/${ctMintAddress}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                        Pump.fun ↗
                      </a>
                      <a href={`https://dexscreener.com/solana/${ctMintAddress}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #f9731640", background: "#f9731612", color: "#f97316", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                        DEX Screener ↗
                      </a>
                      <a href={`https://solscan.io/token/${ctMintAddress}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #3b82f640", background: "#3b82f612", color: "#3b82f6", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                        Solscan ↗
                      </a>
                      <button onClick={() => setDexToken({ address: ctMintAddress, symbol: ct.sym })}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #10b98140", background: "#10b98112", color: "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        DEX Info
                      </button>
                    </div>
                  )}
                  <button onClick={() => { setCtStep("form"); setCt({ name: "", sym: "", desc: "", img: "", devBuy: "0.5" }); setCtMsg(""); setCtFile(null); setCtMintAddress(null); }}
                    style={{ background: "#dc2626", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Launch Another
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AUTO-SNIPE TAB */}
          {tab === "autosnipe" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px", maxWidth: 560 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 8 }}>
                  <IconTarget size={isMobile ? 16 : 18} /> Auto-Snipe
                </h1>
                <span style={{ fontSize: 8, fontWeight: 700, color: asEnabled ? "#10b981" : "#ef4444", background: asEnabled ? "#10b98120" : "#ef444420", border: `1px solid ${asEnabled ? "#10b98140" : "#ef444440"}`, padding: "2px 8px", borderRadius: 8 }}>
                  {asEnabled ? "● ACTIVE" : "○ PAUSED"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#52525b", marginBottom: 20 }}>
                Server wallet buys automatically when a gem hits your score threshold.
              </p>

              {/* Config card */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Trading wallet status */}
                <div style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${iw.status === "unlocked" ? "#3b82f640" : "#27272a"}`, background: iw.status === "unlocked" ? "#3b82f608" : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: iw.status === "unlocked" ? "#3b82f6" : "#52525b", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: iw.status === "unlocked" ? "#3b82f6" : "#52525b" }}>
                      {iw.status === "unlocked" ? "Trading Wallet Active" : iw.status === "locked" ? "Trading Wallet Locked" : "No Trading Wallet"}
                    </div>
                    <div style={{ fontSize: 9, color: "#3f3f46" }}>
                      {iw.status === "unlocked"
                        ? `${shortAddr(iw.publicKey ?? "")} · ${iw.balance?.toFixed(4) ?? "…"} SOL — will be used automatically`
                        : iw.status === "locked"
                        ? "Unlock in Settings → Wallet to use for autosnipe"
                        : "Create one in Settings → Wallet for faster autosnipe"}
                    </div>
                  </div>
                  {iw.status !== "none" && (
                    <button onClick={() => { setTab("settings" as typeof tab); setSettingsSection("wallet"); }}
                      style={{ fontSize: 9, padding: "4px 8px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#52525b", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {iw.status === "locked" ? "Unlock" : "Manage"}
                    </button>
                  )}
                </div>

                {/* Enable toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e2d9f3" }}>Enable Auto-Snipe</div>
                    <div style={{ fontSize: 10, color: "#52525b" }}>Fires on every new gem above Min Score</div>
                  </div>
                  <button onClick={() => setAsEnabled(v => !v)}
                    style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
                      background: asEnabled ? "#10b981" : "#27272a", transition: "background .2s" }}>
                    <span style={{ position: "absolute", top: 2, left: asEnabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                  </button>
                </div>

                {/* Method selector */}
                <div>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 8 }}>EXECUTION METHOD</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {([["api", "API Key", "PumpPortal signs & sends — simplest"], ["local", "Local Sign", "Server keypair signs via RPC — more control"]] as [string, string, string][]).map(([v, l, d]) => (
                      <button key={v} onClick={() => setAsMethod(v as "api" | "local")}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                          border: `1px solid ${asMethod === v ? "#a855f7" : "#27272a"}`,
                          background: asMethod === v ? "#a855f712" : "transparent" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: asMethod === v ? "#a855f7" : "#71717a" }}>{l}</div>
                        <div style={{ fontSize: 9, color: "#52525b", marginTop: 1 }}>{d}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>AMOUNT PER SNIPE (SOL)</span>
                    <span style={{ color: "#eab308", fontWeight: 700 }}>{asAmount} SOL</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    {["0.01", "0.05", "0.1", "0.5"].map(v => (
                      <button key={v} onClick={() => setAsAmount(v)}
                        style={{ flex: 1, padding: "6px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${asAmount === v ? "#eab308" : "#27272a"}`,
                          background: asAmount === v ? "#eab30812" : "transparent",
                          color: asAmount === v ? "#eab308" : "#71717a" }}>{v}</button>
                    ))}
                  </div>
                  <input type="number" value={asAmount} step="0.01" min="0.001" onChange={e => setAsAmount(e.target.value)}
                    style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 7, color: "#f4f4f5", padding: "8px 12px", fontSize: 13, outline: "none" }} />
                </div>

                {/* Min Score */}
                <div>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>MIN SCORE THRESHOLD</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>{asMinScore}</span>
                  </div>
                  <input type="range" min={50} max={95} step={5} value={asMinScore}
                    onChange={e => setAsMinScore(+e.target.value)} style={{ width: "100%" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3f3f46", marginTop: 2 }}>
                    <span>50 — aggressive</span><span>95 — ultra-safe</span>
                  </div>
                </div>
              </div>

              {/* Wallet info */}
              <div style={{ background: "#0c0c0e", border: "1px solid #1c1c1f", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 3 }}>GEASS SERVER WALLET</div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#a1a1aa" }}>4a9RCjw2vFtNVCrb…knN</div>
                </div>
                <a href="https://solscan.io/account/4a9RCjw2vFtNVCrbZcEZ2poCKCYhamSEr8zmboqjoknN" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: "#a855f7", textDecoration: "none" }}>View ↗</a>
              </div>

              {/* Log */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #18181b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#52525b", letterSpacing: "1.5px" }}>SNIPE LOG</span>
                  {asLog.length > 0 && (
                    <button onClick={() => setAsLog([])} style={{ fontSize: 9, background: "transparent", border: "none", color: "#3f3f46", cursor: "pointer" }}>Clear</button>
                  )}
                </div>
                {asLog.length === 0
                  ? <div style={{ padding: "24px", textAlign: "center", fontSize: 10, color: "#27272a" }}>No snipes yet — {asEnabled ? "waiting for gems…" : "enable auto-snipe above"}</div>
                  : asLog.map((entry, i) => (
                    <div key={i} style={{ padding: "8px 14px", borderBottom: "1px solid #0f0f0f", display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: entry.err ? "#ef4444" : "#10b981" }}>
                          {entry.err ? <IconX size={9} /> : <IconCheck size={9} />} ${entry.sym}
                        </div>
                        <div style={{ fontSize: 8, color: "#3f3f46", fontFamily: "monospace" }}>
                          {entry.err ? entry.err.slice(0, 60) : entry.sig?.slice(0, 24) + "…"}
                        </div>
                      </div>
                      <div style={{ fontSize: 8, color: "#3f3f46" }}>
                        {new Date(entry.ts).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* REFERRAL TAB */}
          {tab === "referral" && (() => {
            const refs       = refStats?.referrals ?? 0;
            const clicks     = refStats?.clicks    ?? 0;
            const shareUrl   = refLink || `https://geass.app/?ref=${refCode}`;
            const shareText  = `Join GEASS — real-time Solana alpha intel. My ref link:`;
            const MONO_STYLE = { fontFamily: "ui-monospace,'SF Mono',monospace" } as const;
            // Tier by refs
            const tier =
              refs >= 15 ? { name: "LEGEND",    c: "#a855f7", feeShare: "10%", gpBonus: "+60%", refs: "15+" } :
              refs >= 8  ? { name: "COMMANDER", c: "#ff2b4e", feeShare: "5%",  gpBonus: "+40%", refs: "8+"  } :
              refs >= 4  ? { name: "SCOUT",     c: "#3b82f6", feeShare: "2%",  gpBonus: "+20%", refs: "4+"  } :
                           { name: "RECRUITER", c: "#10b981", feeShare: "1%",  gpBonus: "base", refs: "0+"  };
            const nextTierRefs = refs >= 15 ? null : refs >= 8 ? 15 : refs >= 4 ? 8 : 4;
            const progressPct  = nextTierRefs ? Math.min((refs / nextTierRefs) * 100, 100) : 100;
            return (
              <div style={{ padding: isMobile ? "14px 14px 80px" : "24px 28px", maxWidth: 700 }}>

                {/* Header */}
                <div style={{ position: "relative", background: "#070708", border: "1px solid #18181c", padding: isMobile ? "20px 16px" : "28px 24px", marginBottom: 1, overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: tier.c }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    <span style={{ ...MONO_STYLE, fontSize: 9, fontWeight: 700, color: "#48484f", letterSpacing: "2.5px" }}>GEASS_REFERRAL</span>
                    <span style={{ ...MONO_STYLE, fontSize: 9, fontWeight: 700, color: tier.c, border: `1px solid ${tier.c}40`, padding: "2px 8px", letterSpacing: "1px" }}>{tier.name}</span>
                    <span style={{ ...MONO_STYLE, fontSize: 9, color: "#48484f", marginLeft: "auto" }}>fee_share: <span style={{ color: tier.c }}>{tier.feeShare}</span></span>
                  </div>
                  <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#f5f5f7", marginBottom: 8, lineHeight: 1.1, letterSpacing: "-1px" }}>
                    Invite traders.<br />
                    <span style={{ color: tier.c }}>Earn GP + SOL.</span>
                  </h2>
                  <p style={{ ...MONO_STYLE, fontSize: 11, color: "#5a5a63", lineHeight: 1.7, maxWidth: 440, marginBottom: 20 }}>
                    Every referral earns <span style={{ color: "#ff2b4e" }}>GEASS Points (GP)</span> redeemable for Pro access or SOL. You also earn <span style={{ color: "#10b981" }}>{tier.feeShare} of every trade</span> your referrals make — forever.
                  </p>

                  {/* Tier progress */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 9, ...MONO_STYLE }}>
                      <span style={{ color: "#48484f", letterSpacing: "1px" }}>TIER_PROGRESS</span>
                      <span style={{ color: tier.c }}>{refs}/{nextTierRefs ?? "MAX"} refs{!nextTierRefs ? " — max tier" : ` → ${refs >= 8 ? "LEGEND" : refs >= 4 ? "COMMANDER" : "SCOUT"}`}</span>
                    </div>
                    <div style={{ height: 4, background: "#18181c", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: tier.c, transition: "width .4s" }} />
                    </div>
                  </div>

                  {/* Referral link */}
                  <div style={{ ...MONO_STYLE, fontSize: 9, color: "#48484f", letterSpacing: "1px", marginBottom: 6 }}>YOUR_REF_LINK</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ flex: 1, background: "#000", border: `1px solid ${tier.c}40`, padding: "11px 14px", ...MONO_STYLE, fontSize: isMobile ? 9 : 11, color: tier.c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {shareUrl}
                    </div>
                    <button onClick={copyRefLink} style={{ padding: "0 18px", border: `1px solid ${refCopied ? "#10b981" : tier.c}`, background: refCopied ? "#10b981" : "transparent", color: refCopied ? "#fff" : tier.c, fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", transition: "all .2s", ...MONO_STYLE }}>
                      {refCopied ? "COPIED" : "COPY ▸"}
                    </button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 9, color: "#34343a", ...MONO_STYLE }}>
                    code: <span style={{ color: tier.c }}>{refCode}</span>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "#18181c", marginBottom: 1 }}>
                  {[
                    { l: "GP Balance",     v: geassPoints.toLocaleString(), c: "#ff2b4e", sub: "geass points" },
                    { l: "SOL Earned",     v: solEarned,                    c: "#10b981", sub: "fee share" },
                    { l: "Referrals",      v: refs || "—",                  c: tier.c,   sub: "paid users" },
                    { l: "Link Clicks",    v: clicks || "—",                c: "#3b82f6", sub: "total visits" },
                  ].map(s => (
                    <div key={s.l} style={{ background: "#050506", padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: s.c, marginBottom: 2, ...MONO_STYLE }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: "#5a5a63", letterSpacing: "1px", marginBottom: 2, ...MONO_STYLE }}>{s.l}</div>
                      <div style={{ fontSize: 8, color: "#34343a", ...MONO_STYLE }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* GP Earn rates */}
                <div style={{ background: "#050506", border: "1px solid #18181c", padding: "16px 18px", marginBottom: 1, position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#ff2b4e" }} />
                  <div style={{ ...MONO_STYLE, fontSize: 9, fontWeight: 700, color: "#ff2b4e", letterSpacing: "2px", marginBottom: 12 }}>[ EARN_RATES ]</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                    {[
                      { event: "Friend signs up",          gp: "+50 GP",        c: "#3b82f6" },
                      { event: "Friend pays for Pro",       gp: "+300 GP",       c: "#ff2b4e" },
                      { event: "Friend's trade (ongoing)",  gp: `${tier.feeShare} fee share`, c: "#10b981" },
                      { event: "Link click",                gp: "+2 GP",         c: "#5a5a63" },
                    ].map(r => (
                      <div key={r.event} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#070708", border: "1px solid #18181c" }}>
                        <span style={{ ...MONO_STYLE, fontSize: 11, color: "#9a9aa2" }}>{r.event}</span>
                        <span style={{ ...MONO_STYLE, fontSize: 11, fontWeight: 700, color: r.c }}>{r.gp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Redeem GP */}
                <div style={{ background: "#050506", border: "1px solid #18181c", padding: "16px 18px", marginBottom: 1, position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#10b981" }} />
                  <div style={{ ...MONO_STYLE, fontSize: 9, fontWeight: 700, color: "#10b981", letterSpacing: "2px", marginBottom: 12 }}>[ REDEEM_GP ]</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { cost: "250 GP",  reward: "1 month Pro access",  c: "#8b5cf6", canAfford: geassPoints >= 250  },
                      { cost: "500 GP",  reward: "0.05 SOL",            c: "#10b981", canAfford: geassPoints >= 500  },
                      { cost: "1000 GP", reward: "0.12 SOL (24% bonus)", c: "#10b981", canAfford: geassPoints >= 1000 },
                      { cost: "5000 GP", reward: "Lifetime Pro + Insider access", c: "#ff2b4e", canAfford: geassPoints >= 5000 },
                    ].map(r => (
                      <div key={r.cost} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#070708", border: `1px solid ${r.canAfford ? r.c + "40" : "#18181c"}` }}>
                        <span style={{ ...MONO_STYLE, fontSize: 11, fontWeight: 700, color: "#ff2b4e", minWidth: 60 }}>{r.cost}</span>
                        <span style={{ ...MONO_STYLE, fontSize: 11, color: r.canAfford ? "#f5f5f7" : "#5a5a63", flex: 1 }}>{r.reward}</span>
                        <button style={{ ...MONO_STYLE, padding: "5px 12px", border: `1px solid ${r.canAfford ? r.c : "#222226"}`, background: "transparent", color: r.canAfford ? r.c : "#34343a", fontSize: 9, fontWeight: 700, cursor: r.canAfford ? "pointer" : "not-allowed", letterSpacing: "1px" }}
                          disabled={!r.canAfford}>
                          {r.canAfford ? "REDEEM ▸" : "LOCKED"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tier ladder */}
                <div style={{ background: "#050506", border: "1px solid #18181c", padding: "16px 18px", marginBottom: 1, position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#3b82f6" }} />
                  <div style={{ ...MONO_STYLE, fontSize: 9, fontWeight: 700, color: "#3b82f6", letterSpacing: "2px", marginBottom: 12 }}>[ TIERS ]</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { name: "RECRUITER", r: "0–3 refs",  feeShare: "1%",  gpBonus: "base", c: "#10b981", reached: refs >= 0  },
                      { name: "SCOUT",     r: "4–7 refs",  feeShare: "2%",  gpBonus: "+20%", c: "#3b82f6", reached: refs >= 4  },
                      { name: "COMMANDER", r: "8–14 refs", feeShare: "5%",  gpBonus: "+40%", c: "#ff2b4e", reached: refs >= 8  },
                      { name: "LEGEND",    r: "15+ refs",  feeShare: "10%", gpBonus: "+60%", c: "#a855f7", reached: refs >= 15 },
                    ].map(t => (
                      <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: t.reached ? t.c + "08" : "transparent", border: `1px solid ${t.reached ? t.c + "30" : "#18181c"}` }}>
                        <span style={{ ...MONO_STYLE, fontSize: 10, fontWeight: 700, color: t.reached ? t.c : "#34343a", minWidth: 80 }}>{t.name}</span>
                        <span style={{ ...MONO_STYLE, fontSize: 9, color: "#5a5a63", flex: 1 }}>{t.r}</span>
                        <span style={{ ...MONO_STYLE, fontSize: 9, color: t.reached ? "#10b981" : "#34343a" }}>fee {t.feeShare}</span>
                        <span style={{ ...MONO_STYLE, fontSize: 9, color: t.reached ? t.c : "#34343a", minWidth: 40, textAlign: "right" }}>{t.gpBonus}</span>
                        {t.reached && <span style={{ color: t.c, fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Share */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 1 }}>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ ...MONO_STYLE, display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", border: "1px solid #1d9bf030", background: "#1d9bf010", color: "#1d9bf0", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                    𝕏 X / Twitter
                  </a>
                  <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ ...MONO_STYLE, display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", border: "1px solid #24a1de30", background: "#24a1de10", color: "#24a1de", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                    Telegram
                  </a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ ...MONO_STYLE, display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", border: "1px solid #25d36630", background: "#25d36610", color: "#25d366", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                    WhatsApp
                  </a>
                  <button onClick={copyRefLink}
                    style={{ ...MONO_STYLE, display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", border: "1px solid #222226", background: "transparent", color: refCopied ? "#10b981" : "#5a5a63", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {refCopied ? "COPIED" : "Copy link"}
                  </button>
                </div>

                {/* How it works */}
                <div style={{ background: "#050506", border: "1px solid #18181c", padding: "16px 18px", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#f59e0b" }} />
                  <div style={{ ...MONO_STYLE, fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "2px", marginBottom: 12 }}>[ HOW_IT_WORKS ]</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { n: "01", t: "Share your link", d: "Post to Crypto Twitter, Telegram groups, or DM traders directly. Every click earns GP." },
                      { n: "02", t: "Friend signs up + upgrades", d: "They use your link to access GEASS. On Pro upgrade you get +300 GP instantly." },
                      { n: "03", t: "Earn GP + fee share forever", d: `You earn ${tier.feeShare} of every trade your referrals execute — paid weekly in SOL to your wallet. No cap.` },
                      { n: "04", t: "Redeem GP for SOL or Pro", d: "Convert points to SOL or Pro access anytime. Higher tiers unlock bonus GP rates and higher fee shares." },
                    ].map(s => (
                      <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ ...MONO_STYLE, width: 26, height: 26, background: "#0a0a0c", border: "1px solid #18181c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#f59e0b", flexShrink: 0 }}>{s.n}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#f5f5f7", marginBottom: 2 }}>{s.t}</div>
                          <div style={{ ...MONO_STYLE, fontSize: 10, color: "#5a5a63", lineHeight: 1.65 }}>{s.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <SettingsBody section={settingsSection}>
            {(() => {
            const activeSettings: SettingsSection = settingsSection === "wallet" ? "wallet" : settingsSection === "trading" ? "trading" : "sounds";
            return (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px", maxWidth: 560 }}>
              <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <IconCog size={isMobile ? 16 : 18} /> Settings
              </h1>
              <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 16 }}>Configure your GEASS experience</p>

              {/* Section toggle — keeps Sound Alerts and Wallet fully separate */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                {([
                  ["sounds",  "Sound Alerts", <IconSpeaker key="s" size={11} />],
                  ["wallet",  "Wallet",       <IconWallet  key="w" size={11} />],
                  ["trading", "Trading",      <IconZap     key="t" size={11} />],
                ] as [SettingsSection, string, React.ReactNode][]).map(([id, label, icon]) => {
                  const active = activeSettings === id;
                  return (
                    <button key={id} onClick={() => setSettingsSection(id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
                        border: `1px solid ${active ? "#a855f7" : "#27272a"}`,
                        background: active ? "#a855f722" : "transparent",
                        color: active ? "#a855f7" : "#71717a",
                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
                      }}>
                      {icon} {label}
                    </button>
                  );
                })}
              </div>

              {/* Sounds */}
              {activeSettings === "sounds" && (
              <div id="settings-sounds" style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px", marginBottom: 16, scrollMarginTop: 80 }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <IconSpeaker size={11} /> SOUND ALERTS
                </div>
                {([
                  [gemSoundId,        setGemSoundId,        "New Gem Detected",    "Alpha Scanner token alert"],
                  [kolSoundId,        setKolSoundId,        "KOL Trade Alert",     "Tracked KOL wallet trade"],
                  [memeSoundId,       setMemeSoundId,       "Meme Signals",  "High-score meme opportunity"],
                  [communitySoundId,  setCommunitySoundId,  "Channel",       "New channel message"],
                  [geassAlertSoundId, setGeassAlertSoundId, "GEASS Alerts",  "System notifications & tx confirmations"],
                ] as [SoundId, React.Dispatch<React.SetStateAction<SoundId>>, string, string][]).map(([val, set, label, desc]) => {
                  const isOpen = soundExpandedKey === label;
                  const opt = SOUND_OPTIONS.find(o => o.id === val);
                  return (
                    <div key={label} style={{ marginBottom: 4, borderRadius: 10, border: "1px solid #1e1e21", overflow: "hidden" }}>
                      {/* Row header — always visible */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#0f0f11" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#e2d9f3" }}>{label}</div>
                          <div style={{ fontSize: 10, color: "#52525b", marginTop: 1 }}>{desc}</div>
                        </div>
                        {/* Current sound chip */}
                        <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: val === "off" ? "#27272a" : "#a855f722", color: val === "off" ? "#52525b" : "#a855f7", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {opt?.label}
                        </span>
                        {/* Expand arrow */}
                        <button onClick={() => setSoundExpandedKey(isOpen ? null : label)}
                          style={{ background: "transparent", border: "1px solid #27272a", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#71717a", flexShrink: 0, transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                          ▾
                        </button>
                      </div>
                      {/* Expandable picker */}
                      {isOpen && (
                        <div style={{ padding: "10px 12px 12px", background: "#111113", display: "flex", flexWrap: "wrap", gap: 6, borderTop: "1px solid #1e1e21" }}>
                          {SOUND_OPTIONS.map(o => {
                            const active = val === o.id;
                            return (
                              <button key={o.id} onClick={() => { set(o.id); if (o.id !== "off") playSound(o.id); }}
                                style={{
                                  padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
                                  border: `1px solid ${active ? "#a855f7" : "#27272a"}`,
                                  background: active ? "#a855f722" : "transparent",
                                  color: active ? "#a855f7" : "#71717a",
                                  display: "flex", alignItems: "center", gap: 5,
                                }}>
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}

              {/* Phantom wallet */}
              {activeSettings === "wallet" && (
              <>
              <div id="settings-wallet" style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px", marginBottom: 16, scrollMarginTop: 80 }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <IconWallet size={11} /> PHANTOM WALLET
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>{shortAddr(wallet)}</div>
                    {wBal && <div style={{ fontSize: 10, color: "#3f3f46" }}>{wBal} SOL balance</div>}
                  </div>
                  <button onClick={onDisconnect}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #ef444430", background: "#ef444408", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    Disconnect
                  </button>
                </div>
                {/* Send SOL from Phantom */}
                <div style={{ borderTop: "1px solid #1e1e21", paddingTop: 14 }}>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>SEND SOL</div>
                  <div style={{ marginBottom: 8 }}>
                    <input value={phantomSendTo} onChange={e => setPhantomSendTo(e.target.value)}
                      placeholder="Recipient address…"
                      style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5", padding: "8px 12px", fontSize: 11, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input type="number" value={phantomSendAmt} onChange={e => setPhantomSendAmt(e.target.value)}
                      placeholder="SOL amount" min="0" step="0.001"
                      style={{ flex: 1, background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5", padding: "8px 12px", fontSize: 11, outline: "none" }} />
                    <button disabled={phantomSending} onClick={async () => {
                      setPhantomSendMsg("");
                      const amt = parseFloat(phantomSendAmt);
                      if (!phantomSendTo.trim() || !amt || amt <= 0) { setPhantomSendMsg("Enter a valid address and amount."); return; }
                      setPhantomSending(true);
                      try {
                        const ph = (window as { solana?: { signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> } }).solana;
                        if (!ph) throw new Error("Phantom not found");
                        const conn = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
                        const { blockhash } = await conn.getLatestBlockhash("confirmed");
                        const tx = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(wallet) });
                        tx.add(SystemProgram.transfer({ fromPubkey: new PublicKey(wallet), toPubkey: new PublicKey(phantomSendTo.trim()), lamports: Math.round(amt * LAMPORTS_PER_SOL) }));
                        const { signature } = await ph.signAndSendTransaction(tx);
                        setPhantomSendMsg("✅ Sent! " + signature.slice(0, 16) + "…");
                        setPhantomSendTo(""); setPhantomSendAmt("");
                        fetchBalance(wallet).then(b => b !== null && setWBal(b.toFixed(4)));
                      } catch (e) { setPhantomSendMsg("❌ " + (e instanceof Error ? e.message : String(e))); }
                      finally { setPhantomSending(false); }
                    }}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: phantomSending ? "#27272a" : "linear-gradient(135deg,#dc2626,#7c3aed)", color: phantomSending ? "#52525b" : "#fff", fontSize: 11, fontWeight: 700, cursor: phantomSending ? "wait" : "pointer", whiteSpace: "nowrap" }}>
                      {phantomSending ? "Sending…" : "Send"}
                    </button>
                  </div>
                  {phantomSendMsg && (
                    <div style={{ fontSize: 10, color: phantomSendMsg.startsWith("✅") ? "#10b981" : "#ef4444", wordBreak: "break-all" }}>{phantomSendMsg}</div>
                  )}
                </div>
              </div>

              {/* Internal trading wallet */}
              <InternalWalletPanel iw={iw} />
              </>
              )}

              {activeSettings === "trading" && (
              <div id="settings-trading" style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px", marginBottom: 16, scrollMarginTop: 80 }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <IconZap size={11} /> TRADING DEFAULTS
                </div>
                {([
                  ["Slippage Tolerance", "%", tradingSlippage, setTradingSlippage, "10", "Max price movement allowed (e.g. 10 = 10%)"],
                  ["Priority Fee", "SOL", tradingPriorityFee, setTradingPriorityFee, "0.0005", "Jito tip / priority fee per transaction"],
                  ["Max Buy Amount", "SOL", tradingMaxBuy, setTradingMaxBuy, "0.1", "Maximum SOL per single buy"],
                ] as [string, string, string, (v: string) => void, string, string][]).map(([label, unit, val, set, placeholder, desc]) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#e2d9f3" }}>{label}</span>
                      <span style={{ fontSize: 10, color: "#52525b" }}>{desc}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="number" value={val} onChange={e => set(e.target.value)}
                        placeholder={placeholder} step="any" min="0"
                        style={{ flex: 1, background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5", padding: "8px 12px", fontSize: 12, outline: "none", fontFamily: MONO }}
                      />
                      <span style={{ fontSize: 11, color: "#71717a", minWidth: 30 }}>{unit}</span>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 4, padding: "8px 10px", background: "#0a0a0c", borderRadius: 8, border: "1px solid #1e1e21" }}>
                  These values apply to all buy/sell transactions from the Alpha Scanner and Auto-Snipe.
                </div>
              </div>
              )}
            </div>
            );
            })()}
            </SettingsBody>
          )}

          {/* TRENDING TAB */}
          {tab === "trending" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 8 }}>
                  <IconFlame size={isMobile ? 16 : 18} /> Trending
                </h1>
                <button onClick={() => {
                  setTrendingLoading(true); setMemeLoading(true); setXLoading(true);
                  fetchTrending().then(d => { setTrendingTokens(d.tokens); setTrendingMetas(d.metas); }).finally(() => setTrendingLoading(false));
                  fetchMemeSignals().then(d => { setMemeSignals(d.signals); setMemeNarratives(d.narratives ?? []); }).finally(() => setMemeLoading(false));
                  fetchXSignals().then(d => setXSignals(d.signals)).finally(() => setXLoading(false));
                }} style={{ marginLeft: "auto", fontSize: 9, padding: "4px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#52525b", cursor: "pointer" }}>
                  ↻ Refresh
                </button>
              </div>

              {/* Sub-tab switcher */}
              <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "#0a0a0b", borderRadius: 10, padding: 4, width: "fit-content" }}>
                {([["dex", "🔥 DEX"], ["meme", "🧠 Meme"], ["x", "📰 News"]] as [typeof memeTab, string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setMemeTab(id)}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                      background: memeTab === id ? "#1a1a1d" : "transparent",
                      color: memeTab === id ? "#f4f4f5" : "#52525b" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* DEX SCREENER sub-tab */}
              {memeTab === "dex" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 8, color: "#f97316", background: "#f9731620", border: "1px solid #f9731640", padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>DEX SCREENER</span>
                    {trendingLoading && <span style={{ fontSize: 9, color: "#52525b" }} className="pulse">Loading...</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 18 }}>Top boosted tokens · ranked by community activity, volume &amp; trust signals</p>

                  {trendingMetas.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10 }}>TRENDING CATEGORIES</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {trendingMetas.map(m => (
                          <div key={m.slug} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                            {m.icon?.type === "emoji" && <span style={{ fontSize: 16 }}>{m.icon.value}</span>}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>{m.name}</div>
                              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                                <span style={{ fontSize: 9, color: "#3f3f46" }}>{m.tokenCount} tokens</span>
                                {m.mcChange24 !== 0 && (
                                  <span style={{ fontSize: 9, fontWeight: 600, color: m.mcChange24 >= 0 ? "#10b981" : "#ef4444" }}>
                                    {m.mcChange24 >= 0 ? "+" : ""}{m.mcChange24.toFixed(1)}% 24h
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!trendingLoading && trendingTokens.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
                      <div style={{ color: "#f97316", marginBottom: 8, display: "flex", justifyContent: "center" }}><IconFlame size={24} /></div>
                      <div style={{ fontSize: 12 }}>No trending data — try refreshing</div>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {trendingTokens.map((t, i) => (
                      <div key={t.address} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 24, textAlign: "center", fontSize: 11, fontWeight: 800, color: i < 3 ? "#f97316" : "#3f3f46", flexShrink: 0 }}>#{i + 1}</div>
                        {t.icon
                          ? <img src={t.icon} alt={t.symbol} width={32} height={32} style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#52525b", flexShrink: 0 }}>{t.symbol[0]}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5" }}>${t.symbol}</div>
                          <div style={{ fontSize: 9, color: "#3f3f46", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name} · {t.address.slice(0, 12)}…</div>
                        </div>
                        {!isMobile && (
                          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>
                              {t.priceUsd !== null ? (t.priceUsd < 0.0001 ? t.priceUsd.toExponential(2) : `$${t.priceUsd.toFixed(6)}`) : "—"}
                            </div>
                            {t.priceChange24 !== null && (
                              <div style={{ fontSize: 10, fontWeight: 600, color: t.priceChange24 >= 0 ? "#10b981" : "#ef4444" }}>
                                {t.priceChange24 >= 0 ? "+" : ""}{t.priceChange24.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        )}
                        {!isMobile && t.volume24 !== null && (
                          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
                            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>VOL 24H</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#eab308" }}>
                              {t.volume24 >= 1e6 ? `$${(t.volume24/1e6).toFixed(1)}M` : t.volume24 >= 1e3 ? `$${(t.volume24/1e3).toFixed(0)}K` : `$${t.volume24.toFixed(0)}`}
                            </div>
                          </div>
                        )}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>BOOST</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <IconFlame size={9} />
                              {t.boostAmount >= 1000 ? `${(t.boostAmount/1000).toFixed(0)}k` : t.boostAmount}
                            </span>
                          </div>
                        </div>
                        <a href={t.dexUrl} target="_blank" rel="noopener noreferrer"
                          style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 7, border: "1px solid #f9731630", background: "#f9731610", color: "#f97316", fontSize: 10, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                          DEX ↗
                        </a>
                      </div>
                    ))}
                  </div>
                  {trendingTokens.length > 0 && (
                    <div style={{ marginTop: 14, fontSize: 9, color: "#27272a", textAlign: "center" }}>
                      Data from DEX Screener · Top boosted Solana tokens · Updates every 60s
                    </div>
                  )}
                </>
              )}

              {/* MEME SIGNALS sub-tab */}
              {memeTab === "meme" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 8, color: "#a855f7", background: "#a855f720", border: "1px solid #a855f740", padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>PUMP.FUN · LIVE</span>
                    {memeLoading && <span style={{ fontSize: 9, color: "#52525b" }} className="pulse">Scanning...</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 14 }}>
                    Trend intelligence for token creators — see what narratives are forming right now on pump.fun.
                  </p>

                  {/* Trending Narratives grid */}
                  {memeNarratives.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10 }}>🔥 TRENDING NARRATIVES RIGHT NOW</div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
                        {memeNarratives.map(n => (
                          <div key={n.id} style={{ background: "#111113", border: `1px solid ${n.color}30`, borderRadius: 12, padding: "12px 14px", position: "relative", overflow: "hidden" }}>
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: n.color }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              {n.topIcon && <img src={n.topIcon} alt={n.topSymbol} width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#f4f4f5" }}>{n.label}</span>
                            </div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <div>
                                <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1px" }}>TOKENS</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: n.color }}>{n.count}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1px" }}>MOMENTUM</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: n.momentum >= 50 ? "#10b981" : "#eab308" }}>{n.momentum}</div>
                              </div>
                              {n.totalVol > 0 && (
                                <div>
                                  <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1px" }}>VOL 1H</div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#eab308" }}>{n.totalVol >= 1000 ? `$${(n.totalVol/1000).toFixed(0)}K` : `$${n.totalVol.toFixed(0)}`}</div>
                                </div>
                              )}
                            </div>
                            <div style={{ marginTop: 6, fontSize: 9, color: "#52525b" }}>Top: <span style={{ color: n.color, fontWeight: 700 }}>${n.topSymbol}</span></div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 9, color: "#27272a" }}>
                        💡 Tip: High-momentum narratives = creators are rushing to launch tokens in this theme. Be first.
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 9, fontWeight: 700, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10 }}>TOP MEME SIGNALS</div>

                  {!memeLoading && memeSignals.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
                      <div style={{ fontSize: 12 }}>No signals detected — try refreshing</div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {memeSignals.map((s, i) => {
                      const scoreColor = s.score >= 60 ? "#10b981" : s.score >= 35 ? "#eab308" : "#3f3f46";
                      const scoreBg   = s.score >= 60 ? "#10b98115" : s.score >= 35 ? "#eab30815" : "#27272a15";
                      return (
                        <div key={s.address} style={{ background: "#111113", border: `1px solid ${s.score >= 60 ? "#10b98130" : "#1e1e21"}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                          {/* Rank */}
                          <div style={{ width: 22, textAlign: "center", fontSize: 11, fontWeight: 800, color: i < 3 ? "#a855f7" : "#3f3f46", flexShrink: 0, paddingTop: 2 }}>#{i + 1}</div>
                          {/* Icon */}
                          {s.icon
                            ? <img src={s.icon} alt={s.symbol} width={36} height={36} style={{ borderRadius: 8, flexShrink: 0, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 8, background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#52525b", flexShrink: 0 }}>{s.symbol[0]}</div>
                          }
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5" }}>${s.symbol}</span>
                              <span style={{ fontSize: 10, color: "#71717a" }}>{s.name}</span>
                            </div>
                            {s.description && (
                              <div style={{ fontSize: 10, color: "#52525b", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</div>
                            )}
                            <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                              {s.volume1h !== null && (
                                <span style={{ fontSize: 9, color: "#eab308" }}>
                                  VOL 1H: {s.volume1h >= 1000 ? `$${(s.volume1h/1000).toFixed(0)}K` : `$${s.volume1h.toFixed(0)}`}
                                </span>
                              )}
                              {s.marketCap !== null && s.marketCap > 0 && (
                                <span style={{ fontSize: 9, color: "#3f3f46" }}>
                                  MC: {s.marketCap >= 1e6 ? `$${(s.marketCap/1e6).toFixed(1)}M` : s.marketCap >= 1e3 ? `$${(s.marketCap/1e3).toFixed(0)}K` : `$${s.marketCap.toFixed(0)}`}
                                </span>
                              )}
                              {s.replyCount > 0 && (
                                <span style={{ fontSize: 9, color: "#3f3f46" }}>💬 {s.replyCount}</span>
                              )}
                            </div>
                          </div>
                          {/* Meme score */}
                          <div style={{ textAlign: "center", flexShrink: 0, background: scoreBg, borderRadius: 8, padding: "6px 10px" }}>
                            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 2 }}>MEME</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: scoreColor }}>{s.score}</div>
                          </div>
                          {/* Launch link */}
                          <a href={s.pumpUrl} target="_blank" rel="noopener noreferrer"
                            style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 7, border: "1px solid #a855f730", background: "#a855f710", color: "#a855f7", fontSize: 10, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", alignSelf: "center" }}>
                            PUMP ↗
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {memeSignals.length > 0 && (
                    <div style={{ marginTop: 14, fontSize: 9, color: "#27272a", textAlign: "center" }}>
                      Signals from Pump.fun · Score 60+ = high meme potential · Data refreshes on demand
                    </div>
                  )}
                </>
              )}

              {/* NEWS sub-tab */}
              {memeTab === "x" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    {["🟠 CoinTelegraph", "🔵 Decrypt", "⚡ The Defiant", "📰 CoinDesk", "🟡 BTC Magazine"].map(s => (
                      <span key={s} style={{ fontSize: 8, color: "#71717a", background: "#18181b", border: "1px solid #27272a", padding: "2px 7px", borderRadius: 6, fontWeight: 600 }}>{s}</span>
                    ))}
                    {xLoading && <span style={{ fontSize: 9, color: "#52525b" }} className="pulse">Loading…</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 14 }}>
                    Memecoin &amp; crypto news from top sources — newest first, auto-refreshes every 60s.
                  </p>

                  {!xLoading && xSignals.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📰</div>
                      <div style={{ fontSize: 12 }}>No news loaded — try refreshing</div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {xSignals.map(s => {
                      const age = Math.round((Date.now() - s.pubDate) / 60000);
                      const ageLabel = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age/60)}h ago` : `${Math.round(age/1440)}d ago`;
                      const isMeme = s.score >= 30;
                      return (
                        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                          style={{ textDecoration: "none", display: "flex", alignItems: "flex-start", gap: 10, background: "#111113", border: `1px solid ${isMeme ? "#a855f725" : "#1e1e21"}`, borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: "#1a1a1e", border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                            {s.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#e4e4e7", lineHeight: 1.4, marginBottom: 4 }}>{s.text}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#52525b" }}>{s.author}</span>
                              <span style={{ fontSize: 9, color: "#3f3f46" }}>{ageLabel}</span>
                              {isMeme && <span style={{ fontSize: 8, color: "#a855f7", background: "#a855f715", border: "1px solid #a855f730", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>MEME</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: "#3f3f46", flexShrink: 0, marginTop: 2 }}>↗</span>
                        </a>
                      );
                    })}
                  </div>

                  {xSignals.length > 0 && (
                    <div style={{ marginTop: 14, fontSize: 9, color: "#27272a", textAlign: "center" }}>
                      {xSignals.length} articles · auto-refresh every 60s · click to open source
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PRO TAB */}
          {tab === "pro" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px", maxWidth: 700 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 8 }}>
                  <IconCrown size={isMobile ? 16 : 18} /> GEASS Pro
                </h1>
                {pro.active
                  ? <span style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "#10b98120", border: "1px solid #10b98140", padding: "2px 8px", borderRadius: 8 }}>● ACTIVE</span>
                  : <span style={{ fontSize: 8, fontWeight: 700, color: "#a855f7", background: "#a855f720", border: "1px solid #a855f740", padding: "2px 8px", borderRadius: 8 }}>UPGRADE</span>}
              </div>
              <p style={{ fontSize: 11, color: "#52525b", marginBottom: 24 }}>Intelligence + protection + automation for serious traders</p>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14, marginBottom: 28 }}>
                {[
                  { Icon: IconSearch, title: "Insider & Rug Detector",         desc: "Advanced on-chain analysis detects insider wallets, coordinated buys and rug patterns before they hit Twitter." },
                  { Icon: IconZap,    title: "Dedicated RPC + Helius Priority", desc: "Skip the queue. Your requests go through dedicated Helius nodes — first to detect, first to snipe." },
                  { Icon: IconTarget, title: "Custom AI Rules & Sniping Bots", desc: "Define your own entry conditions. Automate buys based on score, KOL activity, bonding curve progress." },
                  { Icon: IconChart,  title: "Portfolio Analytics + Risk Tools", desc: "Real-time P&L, exposure by tier, drawdown alerts, and AI-generated risk scores per position." },
                ].map(f => (
                  <div key={f.title} style={{ background: "linear-gradient(135deg,#14101f,#111113)", border: "1px solid #7c3aed30", borderRadius: 14, padding: "18px 16px" }}>
                    <div style={{ color: "#a855f7", marginBottom: 8 }}><f.Icon size={22} /></div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e2d9f3", marginBottom: 5 }}>{f.title}</div>
                    <div style={{ fontSize: 10, color: "#71717a", lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>

              {/* Portfolio Analytics — Pro only */}
              {pro.active && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", letterSpacing: "1px" }}>PORTFOLIO ANALYTICS</span>
                    <button onClick={loadPortfolio} disabled={portfolioLoading}
                      style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, border: "1px solid #27272a", background: "transparent", color: "#52525b", cursor: portfolioLoading ? "wait" : "pointer" }}>
                      {portfolioLoading ? "Loading..." : "↻ Refresh"}
                    </button>
                  </div>
                  {portfolioErr && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 8 }}>{portfolioErr}</div>}
                  {portfolio && (
                    <>
                      <div className="app-g3" style={{ marginBottom: 10 }}>
                        {[
                          { l: "SOL Balance", v: `${portfolio.sol.toFixed(4)} SOL`, c: "#10b981" },
                          { l: "Tokens", v: String(portfolio.holdings.length), c: "#a855f7" },
                          { l: "USD Value", v: portfolio.totalUsd !== null ? `$${portfolio.totalUsd.toFixed(2)}` : "—", c: "#eab308" },
                        ].map(s => (
                          <div key={s.l} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 3 }}>{s.l}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: s.c }}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                      {portfolio.holdings.length > 0 && (
                        <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 12px", borderBottom: "1px solid #18181b" }}>
                            {["TOKEN", "AMOUNT", "VALUE"].map(h => (
                              <span key={h} style={{ fontSize: 8, color: "#3f3f46", letterSpacing: "1px", fontWeight: 700 }}>{h}</span>
                            ))}
                          </div>
                          {portfolio.holdings.slice(0, 15).map(h => (
                            <div key={h.mint} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "7px 12px", borderBottom: "1px solid #0f0f0f", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#f4f4f5" }}>{h.symbol}</div>
                                <div style={{ fontSize: 8, color: "#3f3f46", fontFamily: "monospace" }}>{h.mint.slice(0, 8)}…</div>
                              </div>
                              <span style={{ fontSize: 10, color: "#d4d4d8" }}>
                                {h.amount >= 1e6 ? `${(h.amount / 1e6).toFixed(2)}M` : h.amount >= 1e3 ? `${(h.amount / 1e3).toFixed(1)}k` : h.amount.toFixed(2)}
                              </span>
                              <span style={{ fontSize: 10, color: h.usdValue !== null ? "#eab308" : "#3f3f46" }}>
                                {h.usdValue !== null ? `$${h.usdValue.toFixed(2)}` : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {portfolio.holdings.length === 0 && (
                        <div style={{ textAlign: "center", padding: "20px", color: "#3f3f46", fontSize: 11 }}>No token holdings found</div>
                      )}
                    </>
                  )}
                  {!portfolio && !portfolioLoading && !portfolioErr && (
                    <div style={{ textAlign: "center", padding: "20px", color: "#3f3f46", fontSize: 11 }}>Loading portfolio...</div>
                  )}
                </div>
              )}

              {pro.active ? (
                <div style={{ background: "linear-gradient(135deg,#0f1f15,#0a1a12)", border: "1px solid #10b98150", borderRadius: 16, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: 2, background: "linear-gradient(90deg,#10b981,#7c3aed)" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", letterSpacing: "1px", marginBottom: 6 }}>● PRO SUBSCRIPTION ACTIVE</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 16 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 4 }}>EXPIRES IN</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f5" }}>
                        {pro.expiresAt ? `${Math.max(0, Math.ceil((pro.expiresAt - Date.now()) / 86_400_000))} days` : "—"}
                      </div>
                      {pro.expiresAt && <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>{new Date(pro.expiresAt).toLocaleDateString()}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 4 }}>PAYMENT TX</div>
                      <a href={`https://solscan.io/tx/${pro.signature}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, fontFamily: "monospace", color: "#a855f7", textDecoration: "none", wordBreak: "break-all" }}>
                        {pro.signature?.slice(0, 24)}...↗
                      </a>
                    </div>
                  </div>
                  <button onClick={() => pro.refresh()} disabled={pro.loading}
                    style={{ marginTop: 18, padding: "7px 14px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 10, fontWeight: 600, cursor: pro.loading ? "wait" : "pointer" }}>
                    {pro.loading ? "Checking..." : "↻ Refresh status"}
                  </button>
                </div>
              ) : (
                <div style={{ background: "linear-gradient(135deg,#14101f,#0f0c1a)", border: "1px solid #7c3aed50", borderRadius: 16, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: 2, background: "linear-gradient(90deg,#dc2626,#7c3aed)" }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", letterSpacing: "1px", marginBottom: 6 }}>GEASS PRO — 3 SOL / month</div>
                  <div style={{ fontSize: 11, color: "#71717a", marginBottom: 18, lineHeight: 1.6 }}>
                    Paid on-chain in SOL. No subscription, no credit card. After Phantom confirms the transaction, your account activates automatically — no manual approval needed.
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
                    {["Instant on-chain activation (≈30s)", "30 days of Pro access", "Cancel anytime — just don't renew"].map(l => (
                      <li key={l} style={{ display: "flex", gap: 8, fontSize: 11, color: "#e2d9f3" }}>
                        <span style={{ color: "#a855f7", display: "inline-flex" }}><IconCheck size={11} /></span>{l}
                      </li>
                    ))}
                  </ul>
                  {pro.error && (
                    <div style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b15", border: "1px solid #f59e0b30", borderRadius: 6, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 }}>
                      {pro.error}
                    </div>
                  )}
                  <button onClick={() => pro.pay().catch(() => {/* error surfaced via pro.error */})} disabled={pro.loading}
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: pro.loading ? "wait" : "pointer", letterSpacing: ".5px", boxShadow: "0 0 32px #7c3aed30" }}>
                    {pro.loading
                      ? <span className="pulse" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconRefresh size={12} /> Confirming on-chain...</span>
                      : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconSolana size={12} /> Pay 3 SOL — Activate Pro</span>}
                  </button>
                  <div style={{ marginTop: 10, fontSize: 9, color: "#3f3f46", textAlign: "center" }}>
                    Phantom will ask you to approve a transfer of exactly 3 SOL.
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "profile" && (
            <ProfileTab
              wallet={wallet}
              solBalance={wBal}
              solPrice={solPrice}
              isPro={pro.active}
              isMobile={isMobile}
              iw={iw}
            />
          )}

          {tab === "community" && (
            <ComingSoonTab label="Channel" desc="Live community chat and alpha sharing — launching soon." isMobile={isMobile} />
          )}

          {tab === "predictions" && (
            <ComingSoonTab label="Predictions" desc="On-chain prediction markets powered by GEASS — launching soon." isMobile={isMobile} />
          )}

          {tab === "social" && (
            <SocialTrackerTab wallet={wallet} isMobile={isMobile} />
          )}

          {tab === "ai-trading" && (
            <AiTradingTab wallet={wallet} isMobile={isMobile} isElite={pro.active} />
          )}

          {tab === "intel" && (
            <IntelTab isMobile={isMobile} />
          )}

          {tab === "watchlist" && (
            <WatchlistTab isMobile={isMobile} />
          )}
        </main>

        {/* Mobile bottom tab bar — only essential items, settings lives in hamburger */}
        {isMobile && (
          <nav style={{ height: 60, background: "#08080d", borderTop: "1px solid #151520", display: "flex", alignItems: "stretch", flexShrink: 0 }}>
            {NAV.filter(n => n.mobile).map(n => {
              const isActive = tab === n.id;
              const accent = n.pro ? "#a855f7" : "#f43f5e";
              return (
                <button key={n.id} onClick={() => { setTab(n.id as typeof tab); setSettingsOpen(false); }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                    background: isActive ? (n.pro ? "rgba(168,85,247,0.06)" : "rgba(244,63,94,0.06)") : "transparent",
                    border: "none", cursor: "pointer",
                    color: isActive ? accent : "#4a4a5a",
                    borderTop: isActive ? `2px solid ${accent}` : "2px solid transparent",
                    transition: "background .15s, color .15s",
                  }}>
                  <NavIcon id={n.iconId} size={18} />
                  <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: isActive ? ".3px" : "0" }}>{n.mobileLabel ?? n.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Desktop profile panel — toggled via sidebar button */}
      {!isMobile && profilePanelOpen && (
        <ProfilePanel
          wallet={wallet}
          solBalance={wBal}
          solPrice={solPrice}
          isPro={pro.active}
          onClose={() => setProfilePanelOpen(false)}
        />
      )}
    </div>
  );
}
