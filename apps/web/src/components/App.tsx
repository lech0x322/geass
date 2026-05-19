"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { KOLS, NAV, TIER } from "@/lib/config";
import { fmtAge, shortAddr } from "@/lib/utils";
import { scan, fetchBalance, pumpTradeTx, pumpIpfs, fetchPortfolio, autoSnipe, jitoLaunchBundle, jitoSubmit, fetchTrending, type PortfolioResult, type AutoSnipeResult, type TrendingToken, type TrendingMeta } from "@/lib/api";
import { signAllWithPhantom } from "@/lib/wallet";
import { signAndSendBytes } from "@/lib/wallet";
import { useGemStream } from "@/lib/useGemStream";
import { useProStatus } from "@/lib/pro";
import { useKolFeed } from "@/lib/useKolFeed";
import type { Gem } from "@/lib/types";
import { GeassLogo } from "./GeassLogo";
import { GemCard } from "./GemCard";
import { SnipeModal } from "./SnipeModal";

interface Props {
  wallet: string;
  balance: string | null;
  onDisconnect: () => void;
}

export function App({ wallet, balance: initialBalance, onDisconnect }: Props) {
  const [tab, setTab]         = useState<"trades" | "launch" | "gems" | "autosnipe" | "referral" | "pro" | "settings" | "trending">("trades");
  const [gems, setGems]       = useState<Gem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [scanTime, setScanTime] = useState<string | null>(null);
  const [source, setSource]   = useState("");
  const [newIds, setNewIds]   = useState<Set<string>>(new Set());
  const [snipeGem, setSnipeGem] = useState<Gem | null>(null);
  const [wBal, setWBal]       = useState<string | null>(initialBalance);
  const [filters, setFilters] = useState({ minScore: 0, tiers: [] as string[], hasKol: false, noFlags: false });
  const feedTrades = useKolFeed();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pro = useProStatus(wallet);
  const [portfolio, setPortfolio] = useState<PortfolioResult | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioErr, setPortfolioErr] = useState("");

  // Trending
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [trendingMetas,  setTrendingMetas]  = useState<TrendingMeta[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [soundGems, setSoundGems]   = useState(true);
  const [soundKol, setSoundKol]     = useState(true);
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

  // ── Sound helper ─────────────────────────────────────────────
  function playBeep(freq1: number, freq2: number) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc.frequency.setValueAtTime(freq2, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  // ── Real-time SSE stream ────────────────────────────────────
  const stream = useGemStream(true);

  // Keep latest auto-snipe settings in a ref so the stream callback always sees current values
  const asRef = useRef({ enabled: false, amount: "0.01", minScore: 75, method: "api" as "api" | "local" });
  useEffect(() => {
    asRef.current = { enabled: asEnabled, amount: asAmount, minScore: asMinScore, method: asMethod };
  }, [asEnabled, asAmount, asMinScore, asMethod]);

  const soundRef = useRef({ gems: true, kol: true });
  useEffect(() => { soundRef.current = { gems: soundGems, kol: soundKol }; }, [soundGems, soundKol]);

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
    if (soundRef.current.gems && freshGems.length > 0) playBeep(880, 1320);
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
            autoSnipe({ mint: g.contractAddress, amount: amt, method: cfg.method })
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
    setLoading(true); setScanMsg("⚡ Scanning Solana...");
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
    setCtLoad(true);
    try {
      if (ctJito) {
        // ── Jito Bundle path ──────────────────────────────────────
        setCtMsg("Uploading metadata…");
        const result = await jitoLaunchBundle({
          name:       ct.name,
          symbol:     ct.sym,
          description: ct.desc || ct.name,
          devBuySol:  parseFloat(ct.devBuy) || 0,
          tipSol:     parseFloat(ctTip) || 0.003,
          file:       ctFile ?? undefined,
          wallet:     ctJitoMode === "phantom" ? wallet : undefined,
          server:     ctJitoMode === "server",
        });

        if (result.mode === "server") {
          setCtMsg(`✓ Bundle ${result.bundleId.slice(0, 18)}… | ${result.mintPubkey.slice(0, 12)}…`);
          setCtStep("done");
          setCtLoad(false);
          return;
        }

        // Phantom mode — sign create + buy txs
        setCtMsg("Sign in Phantom (2 txs)…");
        const createBytes = Buffer.from(result.createTxB64, "base64");
        const buyBytes    = Buffer.from(result.buyTxB64, "base64");
        const [signedCreateB64, signedBuyB64] = await signAllWithPhantom([
          new Uint8Array(createBytes),
          new Uint8Array(buyBytes),
        ]);
        setCtMsg("Submitting Jito bundle…");
        const { bundleId } = await jitoSubmit([signedCreateB64, signedBuyB64]);
        setCtMsg(`✓ Bundle ${bundleId.slice(0, 18)}… | ${result.mintPubkey.slice(0, 12)}…`);
        setCtStep("done");
      } else {
        // ── Standard Phantom path ─────────────────────────────────
        setCtMsg("Uploading metadata...");
        const form = new FormData();
        form.append("name", ct.name);
        form.append("symbol", ct.sym.toUpperCase());
        form.append("description", ct.desc || ct.name);
        form.append("showName", "true");
        if (ctFile) {
          form.append("file", ctFile, ctFile.name);
        } else if (ct.img) {
          form.append("imageUrl", ct.img);
        }
        const meta = await pumpIpfs(form);
        setCtMsg("Creating on-chain...");
        const mintKp = Keypair.generate();
        const bytes = await pumpTradeTx({
          publicKey: wallet,
          action: "create",
          mint: mintKp.publicKey.toBase58(),
          amount: parseFloat(ct.devBuy) || 0,
          slippage: 10,
          priorityFee: 0.0005,
          pool: "pump",
          tokenMetadata: { name: ct.name, symbol: ct.sym.toUpperCase(), uri: meta.metadataUri },
        });
        const tx = VersionedTransaction.deserialize(bytes);
        tx.sign([mintKp]);
        setCtMsg("Sign in Phantom...");
        const sig = await signAndSendBytes(tx.serialize());
        setCtMsg(`✓ Launched! TX: ${sig.slice(0, 18)}...`);
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
      const sg = localStorage.getItem("geass_sound_gems");
      const sk = localStorage.getItem("geass_sound_kol");
      if (sg !== null) setSoundGems(sg !== "0");
      if (sk !== null) setSoundKol(sk !== "0");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("geass_sound_gems", soundGems ? "1" : "0");
      localStorage.setItem("geass_sound_kol",  soundKol  ? "1" : "0");
    } catch {}
  }, [soundGems, soundKol]);

  useEffect(() => {
    const load = () => fetch("/api/sol-price").then(r => r.json()).then((d: { price: number | null; change: number }) => {
      if (d.price) setSolPrice(d.price);
      setSolChange(d.change ?? 0);
    }).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  // KOL sound trigger
  const prevKolCount = useRef(0);
  useEffect(() => {
    if (feedTrades.length > prevKolCount.current && prevKolCount.current > 0) {
      if (soundRef.current.kol) playBeep(660, 990);
    }
    prevKolCount.current = feedTrades.length;
  }, [feedTrades.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (tab !== "trending") return;
    setTrendingLoading(true);
    fetchTrending().then(d => {
      setTrendingTokens(d.tokens);
      setTrendingMetas(d.metas);
    }).finally(() => setTrendingLoading(false));
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
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: sidebarCollapsed ? "0 10px" : "0 14px", borderBottom: "1px solid #18181b", gap: 8, flexShrink: 0, overflow: "hidden" }}>
        <button onClick={() => { setTab("trades" as typeof tab); }} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, flex: 1, minWidth: 0 }}>
          <GeassLogo size={28} />
          {!sidebarCollapsed && (
            <div style={{ overflow: "hidden" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#f4f4f5", letterSpacing: "1.5px" }}>GEASS</span>
              <div style={{ fontSize: 8, color: "#3f3f46", letterSpacing: "2px", marginTop: -1 }}>ALPHA RECON</div>
            </div>
          )}
        </button>
        {isMobile ? (
          <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#52525b", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        ) : (
          <button onClick={() => setSidebarCollapsed(v => !v)}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid #27272a", color: "#52525b", width: 22, height: 22, borderRadius: 5, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => { setTab(n.id as typeof tab); setSidebarOpen(false); }}
            title={sidebarCollapsed ? n.label : undefined}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: sidebarCollapsed ? 0 : 8, padding: sidebarCollapsed ? "9px 0" : "9px 10px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: 8,
              border: `1px solid ${tab === n.id ? (n.pro ? "#7c3aed40" : "#dc262640") : "transparent"}`,
              background: tab === n.id ? (n.pro ? "#7c3aed12" : "#dc262612") : "transparent",
              color: tab === n.id ? (n.pro ? "#a855f7" : "#ef4444") : n.pro ? "#6d4aab" : "#52525b",
              cursor: "pointer", marginBottom: 2, fontSize: sidebarCollapsed ? 16 : 11, fontWeight: tab === n.id ? 700 : 500, textAlign: "left" }}>
            <span>{n.icon}</span>
            {!sidebarCollapsed && (
              <>
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge && (
                  <span style={{ fontSize: 7, fontWeight: 700,
                    color: n.badge === "NEW" ? "#10b981" : n.pro ? "#a855f7" : "#10b981",
                    background: (n.badge === "NEW" ? "#10b981" : n.pro ? "#a855f7" : "#10b981") + "20",
                    border: `1px solid ${(n.badge === "NEW" ? "#10b981" : n.pro ? "#a855f7" : "#10b981") + "40"}`,
                    padding: "1px 5px", borderRadius: 8 }}>
                    {n.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: sidebarCollapsed ? "8px 4px" : 8, borderTop: "1px solid #18181b", display: "flex", flexDirection: "column", gap: 6 }}>
        {!sidebarCollapsed && pro.active && (
          <div style={{ padding: "5px 10px", background: "linear-gradient(135deg,#dc262615,#7c3aed20)", border: "1px solid #7c3aed40", borderRadius: 7, fontSize: 9, color: "#a855f7", fontWeight: 700, letterSpacing: ".5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>👑 PRO ACTIVE</span>
            {pro.expiresAt && <span style={{ fontWeight: 500, opacity: .7 }}>{Math.max(0, Math.ceil((pro.expiresAt - Date.now()) / 86_400_000))}d</span>}
          </div>
        )}
        {!sidebarCollapsed && (
          <div style={{ padding: "6px 10px", background: "#10b98110", border: "1px solid #10b98130", borderRadius: 7, fontSize: 9, color: "#10b981" }}>
            ✓ {shortAddr(wallet)}{wBal ? ` · ${wBal}◎` : ""}
          </div>
        )}
        <button onClick={onDisconnect} title="Disconnect"
          style={{ width: "100%", padding: sidebarCollapsed ? "6px" : "6px 8px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: sidebarCollapsed ? 14 : 9, fontWeight: 600, cursor: "pointer" }}>
          {sidebarCollapsed ? "⏏" : "Disconnect"}
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100dvh", background: "#09090b", color: "#f4f4f5", fontFamily: "'Inter',system-ui,sans-serif", overflow: "hidden", position: "relative" }}>

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "#000000a0", zIndex: 40, backdropFilter: "blur(2px)" }} />
      )}

      {/* Sidebar — desktop: always visible; mobile: drawer */}
      {!isMobile ? (
        <aside style={{ width: sidebarCollapsed ? 52 : 200, background: "#0c0c0e", borderRight: "1px solid #18181b", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .2s ease" }}>
          {sidebarContent}
        </aside>
      ) : (
        <aside style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 230, background: "#0c0c0e", borderRight: "1px solid #18181b",
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
          <div style={{ height: 50, background: "#0c0c0e", borderBottom: "1px solid #18181b", display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", width: 32, height: 32, borderRadius: 7, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>☰</button>
            <GeassLogo size={22} />
            <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "1.5px" }}>GEASS</span>
            {solPrice && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10 }}>◎</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>${solPrice.toFixed(2)}</span>
                {solChange !== 0 && <span style={{ fontSize: 9, color: solChange >= 0 ? "#10b981" : "#ef4444" }}>{solChange >= 0 ? "+" : ""}{solChange.toFixed(1)}%</span>}
              </div>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
              {streamConnected && <div className="live-dot" style={{ background: statusColor }} />}
              <span style={{ fontSize: 8, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
            </div>
          </div>
        )}

        {/* Ticker + SOL price strip — always visible */}
        {gems.length > 0 && (
          <div style={{ height: 32, borderBottom: "1px solid #18181b", background: "#0a0a0c", display: "flex", alignItems: "center", overflow: "hidden", flexShrink: 0, gap: 0 }}>
            {/* SOL price — desktop only */}
            {!isMobile && solPrice && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRight: "1px solid #18181b", flexShrink: 0, height: "100%" }}>
                <span style={{ fontSize: 12 }}>◎</span>
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

        <main style={{ flex: 1, overflow: "auto" }}>
          {snipeGem && <SnipeModal gem={snipeGem} wallet={wallet} onClose={() => setSnipeGem(null)} />}

          {/* ALPHA SCANNER TAB */}
          {tab === "gems" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", letterSpacing: ".3px" }}>⚡ Alpha Scanner</h1>
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
                      {filters[k] ? "✓" : "+"} {l}
                    </button>
                  ))}
                  <button onClick={doScan} disabled={loading}
                    style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: loading ? "wait" : "pointer", background: loading ? "#111" : "#dc2626", color: "#fff", border: "none", letterSpacing: ".5px" }}>
                    {loading ? <span className="pulse">⟳ Scanning...</span> : "⟳ SCAN NOW"}
                  </button>
                </div>
              </div>

              {scanMsg && <div className="pulse" style={{ textAlign: "center", fontSize: 10, color: "#dc262680", marginBottom: 10 }}>{scanMsg}</div>}

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: isMobile ? 6 : 8, marginBottom: 14 }}>
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
              {!pro.active && gems.length > 0 ? (
                <div style={{ position: "relative" }}>
                  {/* Preview — first 3 visible */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 0 }}>
                    {loading && !gems.length && (
                      <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "50px 20px" }}>
                        <div style={{ fontSize: 18, color: "#dc2626", display: "inline-block" }} className="spin">⊗</div>
                        <div className="pulse" style={{ fontSize: 11, color: "#dc262680", marginTop: 10, letterSpacing: "2px" }}>SCANNING SOLANA MATRIX...</div>
                      </div>
                    )}
                    {filtered.slice(0, 3).map(g => <GemCard key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={setSnipeGem} />)}
                  </div>
                  {/* Blurred locked section */}
                  {filtered.length > 3 && (
                    <div style={{ position: "relative", marginTop: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12, filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
                        {filtered.slice(3, 9).map(g => <GemCard key={g.id} gem={g} isNew={false} onSnipe={() => {}} />)}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                        <div style={{ background: "linear-gradient(135deg,#14101f,#0d0d12)", border: "1px solid #7c3aed60", borderRadius: 20, padding: "28px 36px", textAlign: "center", backdropFilter: "blur(8px)" }}>
                          <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5", marginBottom: 6 }}>{filtered.length - 3} more signals locked</div>
                          <div style={{ fontSize: 11, color: "#71717a", marginBottom: 20, maxWidth: 260, lineHeight: 1.6 }}>Full Alpha Scanner access — all signals, real-time — with GEASS Pro.</div>
                          <button onClick={() => setTab("pro" as typeof tab)}
                            style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 0 24px #7c3aed40" }}>
                            👑 Upgrade to GEASS Pro
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {!loading && gems.length > 0 && filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "#3f3f46" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                      <div style={{ fontSize: 12 }}>No gems match filters — try lowering Min Score</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                  {loading && !gems.length && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "50px 20px" }}>
                      <div style={{ fontSize: 18, color: "#dc2626", display: "inline-block" }} className="spin">⊗</div>
                      <div className="pulse" style={{ fontSize: 11, color: "#dc262680", marginTop: 10, letterSpacing: "2px" }}>SCANNING SOLANA MATRIX...</div>
                    </div>
                  )}
                  {filtered.map(g => <GemCard key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={setSnipeGem} />)}
                  {!loading && gems.length > 0 && filtered.length === 0 && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#3f3f46" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
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

          {/* LIVE FEED TAB */}
          {tab === "trades" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5" }}>📡 Live KOL Feed</h1>
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
                            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr 24px", gap: 3, padding: "4px 10px", borderBottom: "1px solid #111", alignItems: "center", fontSize: 9 }}>
                              <span style={{ fontWeight: 700, color: t.type === "buy" ? "#10b981" : "#ef4444" }}>{t.type === "buy" ? "Buy" : "Sell"}</span>
                              {t.type === "buy"
                                ? <><span style={{ color: "#d4d4d8", fontWeight: 600 }}>{t.sol} <span style={{ color: "#52525b" }}>Sol</span></span><span style={{ color: "#f4f4f5" }}>{t.tokAmt} <span style={{ color: "#10b981", fontWeight: 700 }}>{t.sym}</span></span></>
                                : <><span style={{ color: "#f4f4f5" }}>{t.tokAmt} <span style={{ color: "#ef4444", fontWeight: 700 }}>{t.sym}</span></span><span style={{ color: "#d4d4d8", fontWeight: 600 }}>{t.sol} <span style={{ color: "#52525b" }}>Sol</span></span></>
                              }
                              <span style={{ color: "#3f3f46", textAlign: "right" }}>{fmtAge(t.ago)}</span>
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
              <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", marginBottom: 4 }}>🚀 Launch Token</h1>
              <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 16 }}>Create & launch on Pump.fun · 100% on-chain via Phantom</p>
              <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", marginBottom: 14, background: "#111113", border: "1px solid #10b98130", borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✓ {wallet.slice(0, 16)}...</div>
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

                  {ctMsg && <div style={{ fontSize: 10, color: ctMsg.startsWith("✓") || ctMsg.startsWith("Bundle") ? "#10b981" : "#f59e0b", textAlign: "center" }}>{ctMsg}</div>}
                  <button onClick={launchToken} disabled={ctLoad || !ct.name || !ct.sym}
                    style={{ background: ctJito ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#dc2626,#7c3aed)", border: "none", color: "#fff", padding: 11,
                      borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: ctLoad ? "wait" : "pointer", letterSpacing: ".5px", opacity: (!ct.name || !ct.sym) ? 0.4 : 1 }}>
                    {ctLoad ? <span className="pulse">⟳ Processing...</span> : ctJito ? "⚡ LAUNCH VIA JITO BUNDLE" : "⚡ LAUNCH ON-CHAIN"}
                  </button>
                </div>
              )}
              {ctStep === "done" && (
                <div style={{ textAlign: "center", padding: "30px 20px", background: "#111113", border: "1px solid #10b98130", borderRadius: 12 }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🚀</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981", marginBottom: 6 }}>Token Launched!</div>
                  <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>${ct.sym.toUpperCase()} is live on Pump.fun</div>
                  <div style={{ fontSize: 10, color: "#3f3f46", marginBottom: 16 }}>{ctMsg}</div>
                  <button onClick={() => { setCtStep("form"); setCt({ name: "", sym: "", desc: "", img: "", devBuy: "0.5" }); setCtMsg(""); setCtFile(null); }}
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
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5" }}>⚡ Auto-Snipe</h1>
                <span style={{ fontSize: 8, fontWeight: 700, color: asEnabled ? "#10b981" : "#ef4444", background: asEnabled ? "#10b98120" : "#ef444420", border: `1px solid ${asEnabled ? "#10b98140" : "#ef444440"}`, padding: "2px 8px", borderRadius: 8 }}>
                  {asEnabled ? "● ACTIVE" : "○ PAUSED"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#52525b", marginBottom: 20 }}>
                Server wallet buys automatically when a gem hits your score threshold.
              </p>

              {/* Config card */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>

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
                          {entry.err ? "✗" : "✓"} ${entry.sym}
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
          {tab === "referral" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "24px 28px", maxWidth: 680 }}>

              {/* Hero card */}
              <div style={{ position: "relative", background: "linear-gradient(135deg,#12101e,#0d1520)", border: "1px solid #7c3aed50", borderRadius: 18, padding: isMobile ? "22px 18px" : "32px 28px", marginBottom: 20, overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#dc2626,#7c3aed,#10b981)" }} />
                <div style={{ position: "absolute", right: -30, bottom: -30, width: 180, height: 180, background: "#7c3aed08", borderRadius: "50%", border: "1px solid #7c3aed15" }} />

                <div style={{ fontSize: 8, fontWeight: 700, color: "#10b981", letterSpacing: "2.5px", marginBottom: 10 }}>GEASS REFERRAL PROGRAM</div>
                <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: "#f4f4f5", marginBottom: 8, lineHeight: 1.1 }}>
                  Invite traders.<br />
                  <span style={{ background: "linear-gradient(90deg,#a855f7,#dc2626)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Earn free Pro access.</span>
                </h1>
                <p style={{ fontSize: 12, color: "#71717a", lineHeight: 1.7, maxWidth: 440, marginBottom: 24 }}>
                  Share your link. Friends get <strong style={{ color: "#10b981" }}>10% off</strong> their first month — and you earn <strong style={{ color: "#a855f7" }}>1 free month</strong> for every 3 paid referrals.
                </p>

                {/* Conditions pills */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                  {[
                    { l: "Friend saves", v: "10% — 2.7 SOL/mo", c: "#10b981" },
                    { l: "You earn", v: "1 free month / 3 refs", c: "#a855f7" },
                    { l: "Payout", v: "Automatic, on-chain", c: "#eab308" },
                  ].map(p => (
                    <div key={p.l} style={{ background: p.c + "12", border: `1px solid ${p.c}35`, borderRadius: 10, padding: "8px 14px" }}>
                      <div style={{ fontSize: 8, color: p.c, letterSpacing: "1px", fontWeight: 700, marginBottom: 2 }}>{p.l}</div>
                      <div style={{ fontSize: 11, color: "#e2d9f3", fontWeight: 600 }}>{p.v}</div>
                    </div>
                  ))}
                </div>

                {/* Referral link */}
                <div>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 6 }}>YOUR UNIQUE REFERRAL LINK</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ flex: 1, background: "#09090b", border: "1px solid #7c3aed50", borderRadius: 9, padding: "11px 14px", fontFamily: "monospace", fontSize: isMobile ? 9 : 11, color: "#a855f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {refLink || `https://geass.app/?ref=${refCode}`}
                    </div>
                    <button onClick={copyRefLink}
                      style={{ padding: "0 18px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
                        background: refCopied ? "#10b981" : "linear-gradient(135deg,#7c3aed,#a855f7)",
                        color: "#fff", transition: "background .2s" }}>
                      {refCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { l: "Link Clicks",    v: refStats?.clicks    ?? "—", c: "#3b82f6" },
                  { l: "Paid Referrals", v: refStats?.referrals ?? "—", c: "#a855f7" },
                  { l: "Free Months",    v: freeMonths || "—",          c: "#10b981" },
                ].map(s => (
                  <div key={s.l} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: s.c, marginBottom: 4 }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Share buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I've been using GEASS — the sharpest Solana alpha intel tool out there. Join using my link and get 10% off Pro:\n${refLink || `https://geass.app/?ref=${refCode}`}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "1px solid #1d9bf030", background: "#1d9bf012", color: "#1d9bf0", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                  Share on X (Twitter)
                </a>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(refLink || `https://geass.app/?ref=${refCode}`)}&text=${encodeURIComponent("Join GEASS — real-time Solana alpha intel. Use my link for 10% off Pro:")}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "1px solid #24a1de30", background: "#24a1de12", color: "#24a1de", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                  Share on Telegram
                </a>
                <button onClick={copyRefLink}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {refCopied ? "Copied to clipboard!" : "Copy link"}
                </button>
              </div>

              {/* How it works */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#52525b", letterSpacing: "1.5px", marginBottom: 14 }}>HOW IT WORKS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { n: "01", t: "Share your link", d: "Send your unique link to traders, Crypto Twitter, or Telegram groups." },
                    { n: "02", t: "Friend joins & upgrades", d: "They connect Phantom and pay 2.7 SOL (10% off). Activation is instant." },
                    { n: "03", t: "You earn free Pro", d: "Every 3 paid referrals give you 1 free month added to your account." },
                  ].map(s => (
                    <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7c3aed18", border: "1px solid #7c3aed40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#a855f7", flexShrink: 0 }}>{s.n}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#e2d9f3", marginBottom: 2 }}>{s.t}</div>
                        <div style={{ fontSize: 10, color: "#52525b", lineHeight: 1.6 }}>{s.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px", maxWidth: 560 }}>
              <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", marginBottom: 4 }}>⚙️ Settings</h1>
              <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 24 }}>Configure your GEASS experience</p>

              {/* Sounds */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 14 }}>🔊 SOUND ALERTS</div>
                {([
                  [soundGems, setSoundGems, "New Gem Detected", "Plays a chime when a new token is detected by the Alpha Scanner"],
                  [soundKol,  setSoundKol,  "KOL Trade Alert",  "Plays a tone when a tracked KOL wallet makes a new trade"],
                ] as [boolean, React.Dispatch<React.SetStateAction<boolean>>, string, string][]).map(([val, set, label, desc]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#e2d9f3" }}>{label}</div>
                      <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>{desc}</div>
                    </div>
                    <button onClick={() => set(v => !v)}
                      style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: val ? "#10b981" : "#27272a", transition: "background .2s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: val ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Referral quick section */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 14 }}>👥 REFERRAL</div>
                <div style={{ fontSize: 11, color: "#71717a", marginBottom: 10, lineHeight: 1.6 }}>
                  Share your link — earn <span style={{ color: "#a855f7", fontWeight: 700 }}>1 free Pro month</span> for every 3 paid referrals.
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <div style={{ flex: 1, background: "#09090b", border: "1px solid #7c3aed50", borderRadius: 9, padding: "10px 12px", fontFamily: "monospace", fontSize: 10, color: "#a855f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {refLink || `https://geass.app/?ref=${refCode}`}
                  </div>
                  <button onClick={copyRefLink}
                    style={{ padding: "0 16px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", background: refCopied ? "#10b981" : "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", whiteSpace: "nowrap" }}>
                    {refCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button onClick={() => setTab("referral" as typeof tab)} style={{ fontSize: 10, color: "#a855f7", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                  View full referral stats →
                </button>
              </div>

              {/* Wallet info */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "18px 16px" }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 14 }}>◎ WALLET</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>{shortAddr(wallet)}</div>
                    {wBal && <div style={{ fontSize: 10, color: "#3f3f46" }}>{wBal} SOL balance</div>}
                  </div>
                  <button onClick={onDisconnect}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #ef444430", background: "#ef444408", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TRENDING TAB */}
          {tab === "trending" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5" }}>🔥 Trending on Solana</h1>
                <span style={{ fontSize: 8, color: "#f97316", background: "#f9731620", border: "1px solid #f9731640", padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>DEX SCREENER</span>
                {trendingLoading && <span style={{ fontSize: 9, color: "#52525b" }} className="pulse">Loading...</span>}
                <button onClick={() => { setTrendingLoading(true); fetchTrending().then(d => { setTrendingTokens(d.tokens); setTrendingMetas(d.metas); }).finally(() => setTrendingLoading(false)); }}
                  disabled={trendingLoading} style={{ marginLeft: "auto", fontSize: 9, padding: "4px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#52525b", cursor: trendingLoading ? "wait" : "pointer" }}>
                  ↻ Refresh
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 18 }}>Top boosted tokens · ranked by community activity, volume &amp; trust signals</p>

              {/* Trending Metas / Categories */}
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

              {/* Trending Tokens list */}
              {!trendingLoading && trendingTokens.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔥</div>
                  <div style={{ fontSize: 12 }}>No trending data — try refreshing</div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {trendingTokens.map((t, i) => (
                  <div key={t.address} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Rank */}
                    <div style={{ width: 24, textAlign: "center", fontSize: 11, fontWeight: 800, color: i < 3 ? "#f97316" : "#3f3f46", flexShrink: 0 }}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i + 1}`}
                    </div>
                    {/* Icon */}
                    {t.icon
                      ? <img src={t.icon} alt={t.symbol} width={32} height={32} style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#52525b", flexShrink: 0 }}>{t.symbol[0]}</div>
                    }
                    {/* Name + address */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5" }}>${t.symbol}</div>
                      <div style={{ fontSize: 9, color: "#3f3f46", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name} · {t.address.slice(0, 12)}…</div>
                    </div>
                    {/* Price + change */}
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
                    {/* Volume */}
                    {!isMobile && t.volume24 !== null && (
                      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
                        <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>VOL 24H</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#eab308" }}>
                          {t.volume24 >= 1e6 ? `$${(t.volume24/1e6).toFixed(1)}M` : t.volume24 >= 1e3 ? `$${(t.volume24/1e3).toFixed(0)}K` : `$${t.volume24.toFixed(0)}`}
                        </div>
                      </div>
                    )}
                    {/* Boost */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>BOOST</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316" }}>
                        {"🔥".repeat(Math.min(3, Math.ceil(t.boostAmount / 100)))} {t.boostAmount >= 1000 ? `${(t.boostAmount/1000).toFixed(0)}k` : t.boostAmount}
                      </div>
                    </div>
                    {/* View link */}
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
            </div>
          )}

          {/* PRO TAB */}
          {tab === "pro" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px", maxWidth: 700 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5" }}>👑 GEASS Pro</h1>
                {pro.active
                  ? <span style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "#10b98120", border: "1px solid #10b98140", padding: "2px 8px", borderRadius: 8 }}>● ACTIVE</span>
                  : <span style={{ fontSize: 8, fontWeight: 700, color: "#a855f7", background: "#a855f720", border: "1px solid #a855f740", padding: "2px 8px", borderRadius: 8 }}>UPGRADE</span>}
              </div>
              <p style={{ fontSize: 11, color: "#52525b", marginBottom: 24 }}>Intelligence + protection + automation for serious traders</p>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14, marginBottom: 28 }}>
                {[
                  { icon: "🔍", title: "Insider & Rug Detector", desc: "Advanced on-chain analysis detects insider wallets, coordinated buys and rug patterns before they hit Twitter." },
                  { icon: "⚡", title: "Dedicated RPC + Helius Priority", desc: "Skip the queue. Your requests go through dedicated Helius nodes — first to detect, first to snipe." },
                  { icon: "🤖", title: "Custom AI Rules & Sniping Bots", desc: "Define your own entry conditions. Automate buys based on score, KOL activity, bonding curve progress." },
                  { icon: "📊", title: "Portfolio Analytics + Risk Tools", desc: "Real-time P&L, exposure by tier, drawdown alerts, and AI-generated risk scores per position." },
                ].map(f => (
                  <div key={f.title} style={{ background: "linear-gradient(135deg,#14101f,#111113)", border: "1px solid #7c3aed30", borderRadius: 14, padding: "18px 16px" }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
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
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
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
                        <span style={{ color: "#a855f7" }}>✓</span>{l}
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
                    {pro.loading ? <span className="pulse">⟳ Confirming on-chain...</span> : "◎ Pay 3 SOL — Activate Pro"}
                  </button>
                  <div style={{ marginTop: 10, fontSize: 9, color: "#3f3f46", textAlign: "center" }}>
                    Phantom will ask you to approve a transfer of exactly 3 SOL.
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Mobile bottom tab bar */}
        {isMobile && (
          <nav style={{ height: 56, background: "#0c0c0e", borderTop: "1px solid #18181b", display: "flex", alignItems: "stretch", flexShrink: 0 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id as typeof tab)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: tab === n.id ? (n.pro ? "#a855f7" : "#ef4444") : "#3f3f46",
                  borderTop: tab === n.id ? `2px solid ${n.pro ? "#a855f7" : "#ef4444"}` : "2px solid transparent",
                }}>
                <span style={{ fontSize: 8, fontWeight: tab === n.id ? 700 : 400 }}>{n.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
