"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { KOLS, NAV, TIER } from "@/lib/config";
import { fmtAge, fmtTok, shortAddr } from "@/lib/utils";
import { scan, fetchBalance, pumpTradeTx, pumpIpfs } from "@/lib/api";
import { signAndSendBytes } from "@/lib/wallet";
import { useGemStream } from "@/lib/useGemStream";
import { useProStatus } from "@/lib/pro";
import type { Gem, FeedTrade } from "@/lib/types";
import { GeassLogo } from "./GeassLogo";
import { GemCard } from "./GemCard";
import { SnipeModal } from "./SnipeModal";
import {
  IconScanner, IconActivity, IconRocket, IconSparkle, IconWallet,
  IconShield, IconZap, IconCpu, IconChart,
  IconCheck, IconX, IconPlus, IconRefresh, IconMenu,
  IconArrowUpRight, IconBroadcast, IconHourglass, IconSearch,
} from "./icons";

import type { NavId } from "@/lib/config";
const NAV_ICONS: Record<NavId, typeof IconScanner> = {
  gems: IconScanner,
  feed: IconActivity,
  launch: IconRocket,
  pro: IconSparkle,
};

interface Props {
  wallet: string;
  balance: string | null;
  onDisconnect: () => void;
}

export function App({ wallet, balance: initialBalance, onDisconnect }: Props) {
  const [tab, setTab]         = useState<"gems" | "feed" | "launch" | "pro">("gems");
  const [gems, setGems]       = useState<Gem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [scanTime, setScanTime] = useState<string | null>(null);
  const [source, setSource]   = useState("");
  const [newIds, setNewIds]   = useState<Set<string>>(new Set());
  const [snipeGem, setSnipeGem] = useState<Gem | null>(null);
  const [wBal, setWBal]       = useState<string | null>(initialBalance);
  const [filters, setFilters] = useState({ minScore: 0, tiers: [] as string[], hasKol: false, noFlags: false });
  const [feedTrades, setFeedTrades] = useState<FeedTrade[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pro = useProStatus(wallet);

  // Launch state
  const [ct, setCt]           = useState({ name: "", sym: "", desc: "", img: "", devBuy: "0.5" });
  const [ctStep, setCtStep]   = useState<"form" | "done">("form");
  const [ctLoad, setCtLoad]   = useState(false);
  const [ctMsg, setCtMsg]     = useState("");

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

  // ── Real-time SSE stream ────────────────────────────────────
  const stream = useGemStream(true);

  useEffect(() => {
    if (!stream.newGems.length) return;
    setGems(prev => {
      const known = new Set(prev.map(g => g.id));
      const fresh = stream.newGems.filter(g => !known.has(g.id));
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
    stream.clear();
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
    setLoading(true); setScanMsg("Scanning Solana…");
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

  // ── Simulated KOL feed (visual) ─────────────────────────────
  useEffect(() => {
    if (!gems.length) return;
    const iv = setInterval(() => {
      const k = KOLS[Math.floor(Math.random() * KOLS.length)];
      const g = gems[Math.floor(Math.random() * gems.length)];
      if (!g) return;
      const trade: FeedTrade = {
        id: Date.now() + Math.random(),
        kol: k.name, kolC: k.c,
        type: Math.random() > 0.3 ? "buy" : "sell",
        sym: g.sym,
        sol: (Math.random() * 4 + 0.1).toFixed(3),
        tokAmt: fmtTok(Math.random() * 1e7),
        ago: Math.floor(Math.random() * 60),
      };
      setFeedTrades(prev => [trade, ...prev].slice(0, 40));
    }, 3000);
    return () => clearInterval(iv);
  }, [gems]);

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
      setCtMsg("Uploading metadata...");
      const form = new FormData();
      form.append("name", ct.name);
      form.append("symbol", ct.sym.toUpperCase());
      form.append("description", ct.desc || ct.name);
      form.append("showName", "true");
      if (ct.img) {
        try {
          const ir = await fetch(ct.img, { signal: AbortSignal.timeout(8_000) });
          form.append("file", await ir.blob(), "img.png");
        } catch { /* image is optional */ }
      }
      const meta = await pumpIpfs(form);
      setCtMsg("Creating on-chain...");
      const bytes = await pumpTradeTx({
        publicKey: wallet,
        action: "create",
        amount: parseFloat(ct.devBuy) || 0,
        slippage: 10,
        priorityFee: 0.0005,
        pool: "pump",
        tokenMetadata: { name: ct.name, symbol: ct.sym.toUpperCase(), uri: meta.metadataUri },
      });
      setCtMsg("Sign in Phantom...");
      const sig = await signAndSendBytes(bytes);
      setCtMsg(`✓ Launched! TX: ${sig.slice(0, 18)}...`);
      setCtStep("done");
    } catch (e) {
      setCtMsg("Error: " + (e instanceof Error ? e.message : String(e)));
    }
    setCtLoad(false);
  };

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
      <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #1c1c1f", gap: 10 }}>
        <GeassLogo size={26} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: "#fafafa", letterSpacing: "2px" }}>GEASS</span>
          <span style={{ fontSize: 8, color: "#3f3f46", letterSpacing: "2.5px", marginTop: 2 }}>ALPHA RECON</span>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid #27272a", borderRadius: 8, color: "#a1a1aa", cursor: "pointer" }}
            aria-label="Close menu">
            <IconX size={14} />
          </button>
        )}
      </div>
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV.map(n => {
          const Icon = NAV_ICONS[n.id];
          const active = tab === n.id;
          const accent = n.pro ? "#8b5cf6" : "#ef4444";
          const badgeCol = n.pro ? "#8b5cf6" : "#10b981";
          return (
            <button key={n.id} onClick={() => { setTab(n.id as typeof tab); setSidebarOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                border: `1px solid ${active ? accent + "33" : "transparent"}`,
                background: active ? accent + "10" : "transparent",
                color: active ? accent : "#a1a1aa",
                cursor: "pointer", marginBottom: 2, fontSize: 12.5, fontWeight: active ? 600 : 500, textAlign: "left",
                transition: "background .15s ease, color .15s ease" }}>
              <Icon size={15} strokeWidth={1.7} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && <span style={{ fontSize: 8, fontWeight: 700, color: badgeCol, background: badgeCol + "1a", border: `1px solid ${badgeCol}40`, padding: "1px 6px", borderRadius: 999, letterSpacing: "1px" }}>{n.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 10, borderTop: "1px solid #1c1c1f", display: "flex", flexDirection: "column", gap: 7 }}>
        {pro.active && (
          <div style={{ padding: "7px 11px", background: "linear-gradient(135deg, rgba(239,68,68,.08), rgba(139,92,246,.12))", border: "1px solid rgba(139,92,246,.32)", borderRadius: 8, fontSize: 10, color: "#c4b5fd", fontWeight: 600, letterSpacing: ".5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconSparkle size={11} strokeWidth={2} /> PRO ACTIVE</span>
            {pro.expiresAt && <span style={{ fontWeight: 500, opacity: .75, fontVariantNumeric: "tabular-nums" }}>{Math.max(0, Math.ceil((pro.expiresAt - Date.now()) / 86_400_000))}d</span>}
          </div>
        )}
        <div style={{ padding: "8px 11px", background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 8, fontSize: 10, color: "#10b981", display: "flex", alignItems: "center", gap: 7, fontVariantNumeric: "tabular-nums" }}>
          <IconWallet size={11} strokeWidth={1.8} />
          <span style={{ flex: 1, fontFamily: "ui-monospace,monospace" }}>{shortAddr(wallet)}</span>
          {wBal && <span style={{ color: "#71717a", fontWeight: 600 }}>{wBal} SOL</span>}
        </div>
        <button onClick={onDisconnect}
          style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 10, fontWeight: 500, cursor: "pointer", letterSpacing: ".3px" }}>
          Disconnect wallet
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100dvh", background: "#09090b", color: "#fafafa", fontFamily: "'Inter',ui-sans-serif,system-ui,sans-serif", overflow: "hidden", position: "relative", WebkitFontSmoothing: "antialiased" }}>

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "#000000a0", zIndex: 40, backdropFilter: "blur(2px)" }} />
      )}

      {/* Sidebar — desktop: always visible; mobile: drawer */}
      {!isMobile ? (
        <aside style={{ width: 200, background: "#0c0c0e", borderRight: "1px solid #18181b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
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
          <div style={{ height: 52, background: "#0c0c0e", borderBottom: "1px solid #1c1c1f", display: "flex", alignItems: "center", padding: "0 14px", gap: 12, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu"
              style={{ background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", width: 34, height: 34, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconMenu size={15} />
            </button>
            <GeassLogo size={22} />
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "2px" }}>GEASS</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              {streamConnected && <div className="live-dot" style={{ background: statusColor }} />}
              <span style={{ fontSize: 9, color: statusColor, fontWeight: 600, letterSpacing: ".5px" }}>{statusLabel}</span>
            </div>
          </div>
        )}

        <main style={{ flex: 1, overflow: "auto" }}>
          {snipeGem && <SnipeModal gem={snipeGem} wallet={wallet} onClose={() => setSnipeGem(null)} />}

          {/* ALPHA SCANNER TAB */}
          {tab === "gems" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <IconScanner size={18} strokeWidth={1.7} style={{ color: "#ef4444" }} />
                  <h1 style={{ fontSize: isMobile ? 15 : 19, fontWeight: 700, color: "#fafafa", letterSpacing: "-.3px" }}>Alpha Scanner</h1>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                  {streamConnected && <div className="live-dot" style={{ background: detecting ? "#10b981" : "#10b98180" }} />}
                  <span style={{ fontSize: 9, color: statusColor, fontWeight: streamReconnecting ? 700 : 600, letterSpacing: ".5px" }}>{statusLabel}</span>
                  {scanTime && <span style={{ fontSize: 9, color: "#3f3f46", fontVariantNumeric: "tabular-nums" }}>· {scanTime}</span>}
                  {source && <span style={{ fontSize: 9, color: "#27272a", letterSpacing: ".5px" }}>· {source}</span>}
                </div>
              </div>
              {!isMobile && <p style={{ fontSize: 11.5, color: "#52525b", marginBottom: 18, letterSpacing: ".1px" }}>Real-time detection · Helius pump.fun + DexScreener · Server-side scan with SSE push</p>}

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
                  {([["hasKol", "Has KOL"], ["noFlags", "Safe only"]] as [keyof typeof filters, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setFilters(f => ({ ...f, [k]: !f[k] }))}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${filters[k] ? "#ef4444" : "#27272a"}`,
                        background: filters[k] ? "rgba(239,68,68,.08)" : "transparent",
                        color: filters[k] ? "#ef4444" : "#71717a", letterSpacing: ".2px" }}>
                      {filters[k] ? <IconCheck size={11} strokeWidth={2.2} /> : <IconPlus size={11} strokeWidth={2.2} />}
                      {l}
                    </button>
                  ))}
                  <button onClick={doScan} disabled={loading}
                    style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: loading ? "wait" : "pointer",
                      background: loading ? "#1a1a1d" : "#ef4444",
                      color: "#fff", border: "none", letterSpacing: ".3px" }}>
                    <IconRefresh size={12} strokeWidth={2} className={loading ? "spin" : undefined} />
                    {loading ? "Scanning…" : "Scan now"}
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
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                {loading && !gems.length && (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "56px 20px" }}>
                    <IconRefresh size={26} strokeWidth={1.6} style={{ color: "#ef4444" }} className="spin" />
                    <div className="pulse" style={{ fontSize: 11, color: "rgba(239,68,68,.6)", marginTop: 12, letterSpacing: "2px", fontWeight: 600 }}>SCANNING SOLANA…</div>
                  </div>
                )}
                {filtered.map(g => <GemCard key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={setSnipeGem} />)}
                {!loading && gems.length > 0 && filtered.length === 0 && (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "#52525b" }}>
                    <IconSearch size={26} strokeWidth={1.5} style={{ color: "#3f3f46", marginBottom: 10 }} />
                    <div style={{ fontSize: 12.5 }}>No gems match your filters. Try lowering the minimum score.</div>
                  </div>
                )}
                {!loading && !gems.length && (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "#52525b" }}>
                    <IconHourglass size={26} strokeWidth={1.5} style={{ color: "#3f3f46", marginBottom: 10 }} />
                    <div style={{ fontSize: 12.5 }}>Waiting for the first signals from pump.fun.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LIVE FEED TAB */}
          {tab === "feed" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <IconBroadcast size={18} strokeWidth={1.7} style={{ color: "#3b82f6" }} />
                  <h1 style={{ fontSize: isMobile ? 15 : 19, fontWeight: 700, color: "#fafafa", letterSpacing: "-.3px" }}>Live KOL Feed</h1>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: 9, color: "#10b981", fontWeight: 600, letterSpacing: ".5px" }}>LIVE</span>
                </div>
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
            <div style={{ padding: isMobile ? "14px 14px 80px" : "20px 24px", maxWidth: 540 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                <IconRocket size={18} strokeWidth={1.7} style={{ color: "#a855f7" }} />
                <h1 style={{ fontSize: isMobile ? 15 : 19, fontWeight: 700, color: "#fafafa", letterSpacing: "-.3px" }}>Launch Token</h1>
              </div>
              <p style={{ fontSize: 11.5, color: "#52525b", marginBottom: 18, letterSpacing: ".1px" }}>Create and launch on Pump.fun — end-to-end on-chain via Phantom.</p>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", marginBottom: 16, background: "#0c0c0e", border: "1px solid rgba(16,185,129,.22)", borderRadius: 10, gap: 10 }}>
                <IconCheck size={13} strokeWidth={2.2} style={{ color: "#10b981" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, fontFamily: "ui-monospace,monospace" }}>{wallet.slice(0, 6)}…{wallet.slice(-4)}</div>
                  {wBal && <div style={{ fontSize: 10, color: "#52525b", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{wBal} SOL</div>}
                </div>
                <span style={{ fontSize: 9, color: "rgba(16,185,129,.55)", letterSpacing: ".5px" }}>CONNECTED</span>
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
                    <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 4 }}>IMAGE URL</div>
                    <input value={ct.img} onChange={e => setCt(p => ({ ...p, img: e.target.value }))} placeholder="https://..."
                      style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 7, color: "#f4f4f5", padding: "9px 12px", fontSize: 11, outline: "none" }} />
                  </div>
                  <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>DEV BUY (SOL)</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#eab308" }}>{ct.devBuy} SOL</span>
                    </div>
                    <input type="range" min="0" max="5" step="0.1" value={ct.devBuy} onChange={e => setCt(p => ({ ...p, devBuy: e.target.value }))} style={{ width: "100%" }} />
                  </div>
                  {ctMsg && <div style={{ fontSize: 10.5, color: ctMsg.startsWith("✓") || ctMsg.includes("Launched") ? "#10b981" : "#f59e0b", textAlign: "center" }}>{ctMsg.replace(/^✓\s*/, "")}</div>}
                  <button onClick={launchToken} disabled={ctLoad || !ct.name || !ct.sym}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                      background: "linear-gradient(135deg,#ef4444,#8b5cf6)", border: "none", color: "#fff", padding: "12px",
                      borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: ctLoad ? "wait" : "pointer", letterSpacing: ".2px",
                      opacity: (!ct.name || !ct.sym) ? 0.4 : 1,
                      boxShadow: "0 8px 24px -10px rgba(239,68,68,.6)" }}>
                    {ctLoad
                      ? (<><IconRefresh size={13} strokeWidth={2} className="spin" /> Processing…</>)
                      : (<><IconRocket size={13} strokeWidth={2} /> Launch on-chain</>)}
                  </button>
                </div>
              )}
              {ctStep === "done" && (
                <div style={{ textAlign: "center", padding: "36px 24px", background: "#0c0c0e", border: "1px solid rgba(16,185,129,.32)", borderRadius: 14 }}>
                  <div style={{ display: "inline-flex", padding: 14, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 14, color: "#10b981", marginBottom: 14 }}>
                    <IconCheck size={28} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#10b981", marginBottom: 6, letterSpacing: "-.3px" }}>Token launched</div>
                  <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 4 }}>${ct.sym.toUpperCase()} is live on Pump.fun</div>
                  <div style={{ fontSize: 10.5, color: "#52525b", marginBottom: 20, fontFamily: "ui-monospace,monospace" }}>{ctMsg.replace(/^✓\s*/, "")}</div>
                  <button onClick={() => { setCtStep("form"); setCt({ name: "", sym: "", desc: "", img: "", devBuy: "0.5" }); setCtMsg(""); }}
                    style={{ background: "#ef4444", border: "none", color: "#fff", padding: "9px 22px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Launch another
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PRO TAB */}
          {tab === "pro" && (
            <div style={{ padding: isMobile ? "14px 14px 80px" : "20px 24px", maxWidth: 720 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <IconSparkle size={18} strokeWidth={1.7} style={{ color: "#a78bfa" }} />
                  <h1 style={{ fontSize: isMobile ? 15 : 19, fontWeight: 700, color: "#fafafa", letterSpacing: "-.3px" }}>GEASS Pro</h1>
                </div>
                {pro.active
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", padding: "3px 10px", borderRadius: 999, letterSpacing: "1px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} /> ACTIVE
                    </span>
                  : <span style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.32)", padding: "3px 10px", borderRadius: 999, letterSpacing: "1px" }}>UPGRADE</span>}
              </div>
              <p style={{ fontSize: 11.5, color: "#52525b", marginBottom: 26, letterSpacing: ".1px" }}>Intelligence, protection, and automation for serious traders.</p>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12, marginBottom: 28 }}>
                {[
                  { Icon: IconShield, title: "Insider & Rug Detector",     desc: "Advanced on-chain analysis identifies insider wallets, coordinated buys, and rug patterns before they surface on Twitter." },
                  { Icon: IconZap,    title: "Dedicated RPC & Priority",   desc: "Skip the queue. Requests route through dedicated Helius nodes — first to detect, first to execute." },
                  { Icon: IconCpu,    title: "Custom AI Rules & Bots",     desc: "Define your own entry conditions. Automate buys based on score, KOL activity, bonding-curve progress." },
                  { Icon: IconChart,  title: "Portfolio Analytics & Risk", desc: "Real-time P&L, exposure by tier, drawdown alerts, and AI-generated risk scores per position." },
                ].map(f => (
                  <div key={f.title} style={{ background: "linear-gradient(180deg,#11101a,#0d0c14)", border: "1px solid rgba(139,92,246,.18)", borderRadius: 12, padding: "18px 18px" }}>
                    <div style={{ display: "inline-flex", padding: 8, borderRadius: 9, background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.28)", color: "#c4b5fd", marginBottom: 12 }}>
                      <f.Icon size={16} strokeWidth={1.8} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e9e4f8", marginBottom: 5 }}>{f.title}</div>
                    <div style={{ fontSize: 11.5, color: "#71717a", lineHeight: 1.65 }}>{f.desc}</div>
                  </div>
                ))}
              </div>

              {pro.active ? (
                <div style={{ background: "linear-gradient(180deg,#0e1812,#0a1410)", border: "1px solid rgba(16,185,129,.32)", borderRadius: 16, padding: "24px 22px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: 2, background: "linear-gradient(90deg,#10b981,#8b5cf6)" }} />
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#10b981", letterSpacing: "1.5px", marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                    PRO SUBSCRIPTION ACTIVE
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginTop: 18 }}>
                    <div>
                      <div style={{ fontSize: 9.5, color: "#52525b", letterSpacing: "1.5px", marginBottom: 6 }}>EXPIRES IN</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#fafafa", letterSpacing: "-.5px", fontVariantNumeric: "tabular-nums" }}>
                        {pro.expiresAt ? `${Math.max(0, Math.ceil((pro.expiresAt - Date.now()) / 86_400_000))} days` : "—"}
                      </div>
                      {pro.expiresAt && <div style={{ fontSize: 11, color: "#71717a", marginTop: 3 }}>{new Date(pro.expiresAt).toLocaleDateString()}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 9.5, color: "#52525b", letterSpacing: "1.5px", marginBottom: 6 }}>PAYMENT TX</div>
                      <a href={`https://solscan.io/tx/${pro.signature}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontFamily: "ui-monospace,monospace", color: "#a78bfa", textDecoration: "none", wordBreak: "break-all" }}>
                        {pro.signature?.slice(0, 22)}…
                        <IconArrowUpRight size={11} strokeWidth={2} />
                      </a>
                    </div>
                  </div>
                  <button onClick={() => pro.refresh()} disabled={pro.loading}
                    style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 500, cursor: pro.loading ? "wait" : "pointer" }}>
                    <IconRefresh size={11} strokeWidth={2} className={pro.loading ? "spin" : undefined} />
                    {pro.loading ? "Checking…" : "Refresh status"}
                  </button>
                </div>
              ) : (
                <div style={{ background: "linear-gradient(180deg,#11101a,#0d0c14)", border: "1px solid rgba(139,92,246,.32)", borderRadius: 16, padding: "26px 24px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: 2, background: "linear-gradient(90deg,#ef4444,#8b5cf6)" }} />
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "1.5px" }}>GEASS PRO</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#fafafa", letterSpacing: "-.8px", fontVariantNumeric: "tabular-nums" }}>3 SOL</div>
                    <div style={{ fontSize: 12, color: "#52525b", fontWeight: 500 }}>/ month</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#71717a", marginBottom: 22, lineHeight: 1.65 }}>
                    Paid on-chain in SOL. No subscription billing, no credit card. After Phantom confirms the transaction, your account activates automatically.
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
                    {["Instant on-chain activation (≈2–5 s with webhook)", "30 days of Pro access", "Cancel anytime — just don't renew"].map(l => (
                      <li key={l} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "#e9e4f8" }}>
                        <IconCheck size={13} strokeWidth={2.2} style={{ color: "#a78bfa" }} />
                        {l}
                      </li>
                    ))}
                  </ul>
                  {pro.error && (
                    <div style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.24)", borderRadius: 7, padding: "9px 12px", marginBottom: 14, lineHeight: 1.5 }}>
                      {pro.error}
                    </div>
                  )}
                  <button onClick={() => pro.pay().catch(() => {/* error surfaced via pro.error */})} disabled={pro.loading}
                    style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "13px",
                      borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#8b5cf6)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: pro.loading ? "wait" : "pointer", letterSpacing: ".2px",
                      boxShadow: "0 8px 26px -10px rgba(139,92,246,.55)" }}>
                    {pro.loading
                      ? (<><IconRefresh size={13} strokeWidth={2} className="spin" /> Confirming on-chain…</>)
                      : (<><IconWallet size={13} strokeWidth={2} /> Pay 3 SOL — activate Pro</>)}
                  </button>
                  <div style={{ marginTop: 12, fontSize: 10.5, color: "#52525b", textAlign: "center" }}>
                    Phantom will ask you to approve a transfer of exactly 3 SOL.
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Mobile bottom tab bar */}
        {isMobile && (
          <nav style={{ height: 58, background: "#0c0c0e", borderTop: "1px solid #1c1c1f", display: "flex", alignItems: "stretch", flexShrink: 0 }}>
            {NAV.map(n => {
              const Icon = NAV_ICONS[n.id];
              const active = tab === n.id;
              const accent = n.pro ? "#a78bfa" : "#ef4444";
              return (
                <button key={n.id} onClick={() => setTab(n.id as typeof tab)}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    background: "transparent", border: "none", cursor: "pointer",
                    color: active ? accent : "#52525b",
                    borderTop: active ? `2px solid ${accent}` : "2px solid transparent",
                  }}>
                  <Icon size={17} strokeWidth={1.7} />
                  <span style={{ fontSize: 9, fontWeight: active ? 600 : 500, letterSpacing: ".2px" }}>{n.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
