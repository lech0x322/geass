"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGemStream } from "@/lib/useGemStream";
import { useKolFeed } from "@/lib/useKolFeed";
import { useWatchlist } from "@/lib/useWatchlist";
import { useProStatus } from "@/lib/pro";
import { useInternalWallet } from "@/lib/useInternalWallet";
import { fetchBalance, fetchTrending } from "@/lib/api";
import type { TrendingToken } from "@/lib/api";
import { TIER, KOLS } from "@/lib/config";
import type { Gem, FeedTrade } from "@/lib/types";
import { GeassLogo } from "./GeassLogo";
import { SnipeModal } from "./SnipeModal";
import { InternalWalletPanel } from "./InternalWalletPanel";
import { NotificationsBell } from "./NotificationsBell";
import { WatchlistTab } from "./WatchlistTab";
import {
  IconSearch, IconX, IconZap, IconBroadcast, IconFlame,
  IconUser, IconSolana, IconRefresh, IconHome,
} from "./icons";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";
const BG   = "#070708";
const BG2  = "#0c0c0f";
const BORDER = "#1a1a20";
const ACCENT = "#ff2b4e";

type MTab = "home" | "scan" | "kol" | "trending" | "watchlist" | "me";

function fmtMcap(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "k";
  return "$" + n.toFixed(0);
}

/* ── Compact gem row ─────────────────────────────────────────── */
function GemRow({ gem, isNew, onSnipe, onWatch, isWatched }: {
  gem: Gem; isNew: boolean;
  onSnipe: (g: Gem) => void;
  onWatch: (mint: string, sym: string, name: string) => void;
  isWatched: boolean;
}) {
  const tier = TIER[gem.tier] || TIER.C_TIER;
  const age = gem.ageHours !== null
    ? gem.ageHours < 1 ? `${Math.round(gem.ageHours * 60)}m` : `${gem.ageHours.toFixed(1)}h`
    : "?";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderBottom: `1px solid ${BORDER}`,
      background: isNew ? "#10b98108" : "transparent",
      borderLeft: isNew ? "2px solid #10b981" : "2px solid transparent",
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 8,
        background: "linear-gradient(135deg,#dc262625,#7c3aed25)", border: `1px solid ${tier.c}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, color: tier.c, flexShrink: 0 }}>
        {gem.sym?.[0] || "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#f4f4f5" }}>${gem.sym}</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: tier.c, background: tier.c + "18",
            border: `1px solid ${tier.c}30`, padding: "1px 5px", borderRadius: 3 }}>{tier.l}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: tier.c }}>{gem.score}</span>
        </div>
        <div style={{ fontSize: 10, color: "#52525b", marginTop: 2, display: "flex", gap: 8 }}>
          <span>{fmtMcap(gem.mcap)}</span>
          <span>·</span>
          <span>{age}</span>
          {gem.kol > 0 && <><span>·</span><span style={{ color: "#10b981" }}>{gem.kol} KOL</span></>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <button onClick={() => onWatch(gem.contractAddress, gem.sym, gem.name)}
          style={{ width: 34, height: 34, borderRadius: 7,
            border: `1px solid ${isWatched ? "#f59e0b55" : BORDER}`,
            background: isWatched ? "#f59e0b12" : "transparent",
            color: isWatched ? "#f59e0b" : "#3f3f46",
            fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isWatched ? "★" : "☆"}
        </button>
        <button onClick={() => onSnipe(gem)}
          style={{ height: 34, padding: "0 12px", borderRadius: 7,
            background: "linear-gradient(135deg,#dc2626,#7c3aed)",
            border: "none", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4 }}>
          <IconZap size={10} /> BUY
        </button>
      </div>
    </div>
  );
}

/* ── Compact KOL row ─────────────────────────────────────────── */
function KolRow({ t }: { t: FeedTrade }) {
  const kol = KOLS.find(k => k.name === t.kol);
  const isBuy = t.type === "buy";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: kol?.c || "#71717a", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: "#f4f4f5" }}>{t.kol}</span>
          <span style={{ fontSize: 9, fontWeight: 700,
            color: isBuy ? "#10b981" : "#ef4444",
            background: isBuy ? "#10b98115" : "#ef444415",
            padding: "1px 5px", borderRadius: 3 }}>
            {t.type.toUpperCase()}
          </span>
          <span style={{ fontWeight: 700, fontSize: 12, color: "#f4f4f5" }}>${t.sym}</span>
        </div>
        <div style={{ fontSize: 10, color: "#52525b", marginTop: 1 }}>
          {t.sol} SOL · {t.ago < 60 ? `${t.ago}s` : `${Math.floor(t.ago / 60)}m`} ago
        </div>
      </div>
      {t.mint && (
        <a href={`https://dexscreener.com/solana/${t.mint}`} target="_blank" rel="noreferrer"
          style={{ fontSize: 9, color: "#3b82f6", textDecoration: "none", flexShrink: 0 }}>
          Chart ↗
        </a>
      )}
    </div>
  );
}

/* ── Compact Trending row ────────────────────────────────────── */
function TrendRow({ t, rank }: { t: TrendingToken; rank: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 10, color: "#3f3f46", minWidth: 20, textAlign: "right" }}>#{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "#f4f4f5" }}>${t.symbol}</div>
        <div style={{ fontSize: 10, color: "#52525b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {t.priceChange24 !== null && (
          <div style={{ fontSize: 12, fontWeight: 700, color: (t.priceChange24 ?? 0) >= 0 ? "#10b981" : "#ef4444" }}>
            {(t.priceChange24 ?? 0) >= 0 ? "+" : ""}{(t.priceChange24 ?? 0).toFixed(1)}%
          </div>
        )}
        {t.volume24 !== null && (
          <div style={{ fontSize: 9, color: "#52525b" }}>{fmtMcap(t.volume24 ?? 0)} vol</div>
        )}
      </div>
    </div>
  );
}

/* ── Search bar with CA scan ─────────────────────────────────── */
function MobileSearchBar() {
  const [q, setQ] = useState("");
  const [caResult, setCaResult] = useState<{ total: number; tier: string; sym: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const isSolana = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());

  const scan = useCallback((mint: string) => {
    setCaResult(null); setLoading(true);
    fetch(`/api/mri/score?mint=${encodeURIComponent(mint)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCaResult(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, background: BG2 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#52525b", pointerEvents: "none", display: "flex" }}>
          <IconSearch size={13} />
        </span>
        <input
          value={q} onChange={e => { setQ(e.target.value); setCaResult(null); }}
          placeholder="Search or paste CA to scan…"
          style={{ width: "100%", background: "#111113", border: `1px solid ${BORDER}`, borderRadius: 9,
            color: "#f4f4f5", padding: "10px 34px 10px 32px", fontSize: 13, outline: "none",
            boxSizing: "border-box" }}
        />
        {q && (
          <button onClick={() => { setQ(""); setCaResult(null); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", color: "#52525b", cursor: "pointer", padding: 4, display: "flex" }}>
            <IconX size={13} />
          </button>
        )}
      </div>
      {isSolana(q) && (
        <div style={{ marginTop: 8 }}>
          {!caResult && (
            <button onClick={() => scan(q.trim())}
              style={{ width: "100%", padding: "10px 0", borderRadius: 8,
                border: "1px solid #ff2b4e55", background: "#ff2b4e12",
                color: ACCENT, fontSize: 12, fontWeight: 700,
                cursor: loading ? "wait" : "pointer" }}>
              {loading ? "Scanning…" : "⚡ Scan Token"}
            </button>
          )}
          {caResult && (
            <div style={{ background: "#0a0a0d", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px",
              display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#f4f4f5" }}>${caResult.sym}</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                background: caResult.tier === "ALERT" ? "#ff2b4e22" : "#10b98122",
                color: caResult.tier === "ALERT" ? ACCENT : "#10b981",
                border: `1px solid ${caResult.tier === "ALERT" ? "#ff2b4e44" : "#10b98144"}` }}>
                {caResult.tier}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>
                {caResult.total}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Home ───────────────────────────────────────────────── */
function MHomeTab({ solPrice, solChange, gems, newIds, feedTrades, detecting, streamConnected, onSnipe, onWatch, watchlist }:
  { solPrice: number | null; solChange: number; gems: Gem[]; newIds: Set<string>; feedTrades: FeedTrade[];
    detecting: boolean; streamConnected: boolean;
    onSnipe: (g: Gem) => void; onWatch: (mint: string, sym: string, name: string) => void;
    watchlist: ReturnType<typeof useWatchlist> }) {
  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {/* SOL banner */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
        <IconSolana size={20} />
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f4f4f5" }}>
            {solPrice ? `$${solPrice.toFixed(2)}` : "—"}
          </div>
          <div style={{ fontSize: 10, color: solChange >= 0 ? "#10b981" : "#ef4444" }}>
            {solChange !== 0 ? `${solChange >= 0 ? "+" : ""}${solChange.toFixed(2)}% 24h` : "Solana"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%",
              background: streamConnected ? (detecting ? "#10b981" : "#10b98180") : "#ef4444",
              animation: "dot-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 9, color: streamConnected ? "#10b981" : "#ef4444", fontWeight: 700 }}>
              {streamConnected ? (detecting ? "DETECTING" : "LIVE") : "OFFLINE"}
            </span>
          </div>
          <span style={{ fontSize: 9, color: "#3f3f46" }}>{gems.length} gems found</span>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: BORDER, borderBottom: `1px solid ${BORDER}` }}>
        {[
          { l: "GEMS", v: gems.length },
          { l: "KOL TRADES", v: feedTrades.length },
          { l: "WATCHLIST", v: watchlist.entries.length },
        ].map(s => (
          <div key={s.l} style={{ background: BG, padding: "10px 12px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>{s.v}</div>
            <div style={{ fontSize: 8, color: "#3f3f46", marginTop: 1, letterSpacing: "1px" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Top 3 gems */}
      <div style={{ padding: "8px 14px 4px", fontSize: 9, color: "#52525b", fontWeight: 700, letterSpacing: "1.5px" }}>
        TOP GEMS
      </div>
      {gems.length === 0 ? (
        <div style={{ padding: "16px 14px", color: "#3f3f46", fontSize: 11 }}>Scanning for new tokens…</div>
      ) : gems.slice(0, 3).map(g => (
        <GemRow key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={onSnipe} onWatch={onWatch} isWatched={watchlist.has(g.id)} />
      ))}

      {/* Top 5 KOL trades */}
      <div style={{ padding: "8px 14px 4px", fontSize: 9, color: "#52525b", fontWeight: 700, letterSpacing: "1.5px", borderTop: `1px solid ${BORDER}`, marginTop: 6 }}>
        KOL ACTIVITY
      </div>
      {feedTrades.length === 0 ? (
        <div style={{ padding: "16px 14px", color: "#3f3f46", fontSize: 11 }}>Waiting for trades…</div>
      ) : feedTrades.slice(0, 5).map(t => <KolRow key={t.id} t={t} />)}
    </div>
  );
}

/* ── Tab: Scan ───────────────────────────────────────────────── */
function MScanTab({ gems, newIds, scanning, onScan, onSnipe, onWatch, watchlist }:
  { gems: Gem[]; newIds: Set<string>; scanning: boolean;
    onScan: () => void; onSnipe: (g: Gem) => void;
    onWatch: (mint: string, sym: string, name: string) => void;
    watchlist: ReturnType<typeof useWatchlist> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <MobileSearchBar />
      <div style={{ padding: "9px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8, background: BG2, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: "#f4f4f5" }}>Alpha Scanner</span>
        <span style={{ fontSize: 9, color: "#52525b" }}>{gems.length} tokens</span>
        <button onClick={onScan} disabled={scanning}
          style={{ marginLeft: "auto", height: 34, padding: "0 12px", borderRadius: 7,
            border: `1px solid ${ACCENT}55`, background: scanning ? "#ff2b4e08" : "#ff2b4e12",
            color: scanning ? "#ff2b4e80" : ACCENT, fontSize: 10, fontWeight: 700,
            cursor: scanning ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          {scanning ? "Scanning…" : <><IconRefresh size={10} /> Scan</>}
        </button>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {gems.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
            <div style={{ fontSize: 13, color: "#52525b", marginBottom: 16 }}>No gems found yet.</div>
            <button onClick={onScan}
              style={{ padding: "11px 28px", borderRadius: 8, border: `1px solid ${ACCENT}55`,
                background: "#ff2b4e12", color: ACCENT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Start Scan
            </button>
          </div>
        ) : gems.map(g => (
          <GemRow key={g.id} gem={g} isNew={newIds.has(g.id)} onSnipe={onSnipe} onWatch={onWatch} isWatched={watchlist.has(g.id)} />
        ))}
      </div>
    </div>
  );
}

/* ── Bottom nav items ────────────────────────────────────────── */
const NAV_ITEMS: { id: MTab; Icon: React.FC<{size?:number}>; label: string }[] = [
  { id: "home",     Icon: IconHome,      label: "Home"    },
  { id: "scan",     Icon: IconZap,       label: "Scan"    },
  { id: "kol",      Icon: IconBroadcast, label: "KOL"     },
  { id: "trending", Icon: IconFlame,     label: "Trend"   },
  { id: "me",       Icon: IconUser,      label: "Me"      },
];

/* ══════════════════════════════════════════════════════════════
   MAIN MOBILE SHELL
══════════════════════════════════════════════════════════════ */
export function MobileShell({ wallet, balance, onDisconnect }: {
  wallet: string;
  balance: string | null;
  onDisconnect: () => void;
}) {
  const [tab, setTab]         = useState<MTab>("home");
  const [snipeGem, setSnipe]  = useState<Gem | null>(null);
  const [wBal, setWBal]       = useState<string | null>(balance);
  const [solPrice, setSol]    = useState<number | null>(null);
  const [solChange, setChg]   = useState(0);
  const [trending, setTrend]  = useState<TrendingToken[]>([]);
  const [trendLoad, setTL]    = useState(false);
  const [gems, setGems]       = useState<Gem[]>([]);
  const [newIds, setNewIds]   = useState<Set<string>>(new Set());
  const [scanning, setScan]   = useState(false);
  const idsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stream      = useGemStream(true);
  const feedTrades  = useKolFeed();
  const watchlist   = useWatchlist();
  const iw          = useInternalWallet();
  useProStatus(wallet); // keep pro status warmed up

  const detecting       = stream.detecting;
  const streamConnected = stream.connected;

  // Merge stream gems
  useEffect(() => {
    if (!stream.newGems.length) return;
    setGems(prev => {
      const known = new Set(prev.map(g => g.id));
      const fresh = stream.newGems.filter(g => !known.has(g.id));
      if (!fresh.length) return prev;
      const ids = new Set(fresh.map((g: Gem) => g.id));
      setNewIds(ids);
      if (idsTimer.current) clearTimeout(idsTimer.current);
      idsTimer.current = setTimeout(() => setNewIds(new Set()), 10_000);
      return [...fresh, ...prev].slice(0, 30);
    });
    stream.clear();
  }, [stream.newGems]); // eslint-disable-line react-hooks/exhaustive-deps

  // SOL price
  useEffect(() => {
    const load = () => fetch("/api/sol-price").then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.price) { setSol(d.price); setChg(d.change24h ?? 0); } }).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // Balance
  useEffect(() => {
    fetchBalance(wallet).then(b => b !== null && setWBal(b.toFixed(4))).catch(() => {});
  }, [wallet]);

  // Trending — lazy load when tab opened
  useEffect(() => {
    if (tab !== "trending" || trending.length > 0) return;
    setTL(true);
    fetchTrending().then(d => { setTrend(d.tokens ?? []); setTL(false); }).catch(() => setTL(false));
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const startScan = useCallback(() => {
    setScan(true);
    fetch("/api/scan?count=12")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.gems?.length) {
          const fresh = d.gems as Gem[];
          setGems(fresh);
          const ids = new Set(fresh.map((g: Gem) => g.id));
          setNewIds(ids);
          if (idsTimer.current) clearTimeout(idsTimer.current);
          idsTimer.current = setTimeout(() => setNewIds(new Set()), 10_000);
        }
        setScan(false);
      })
      .catch(() => setScan(false));
  }, []);

  const handleWatch = useCallback((mint: string, sym: string, name: string) => {
    if (watchlist.has(mint)) watchlist.remove(mint); else watchlist.add({ mint, sym, name });
  }, [watchlist]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: BG, fontFamily: MONO, overflow: "hidden" }}>
      <style>{`
        @keyframes dot-pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { -webkit-tap-highlight-color:transparent; box-sizing:border-box }
        button,a { touch-action:manipulation }
        button:active { opacity:.72 }
        ::-webkit-scrollbar { width:2px }
        ::-webkit-scrollbar-thumb { background:#2a2a30 }
        input { font-family:${MONO} }
        input:focus { border-color:${ACCENT} !important; box-shadow:0 0 0 1px ${ACCENT}35 !important; outline:none }
      `}</style>

      {/* ── Top bar ─────────────────────────────── */}
      <div style={{ height: 52, background: BG2, borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", padding: "0 12px", gap: 8, flexShrink: 0 }}>
        <div style={{ filter: "drop-shadow(0 0 5px rgba(255,43,78,0.3))", display: "flex", flexShrink: 0 }}>
          <GeassLogo size={20} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: "2.5px", color: "#f4f4f5", flexShrink: 0 }}>GEASS</span>

        {solPrice && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#111113",
            border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
            <IconSolana size={11} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>${solPrice.toFixed(2)}</span>
            {solChange !== 0 && <span style={{ fontSize: 9, color: solChange >= 0 ? "#10b981" : "#ef4444" }}>
              {solChange >= 0 ? "+" : ""}{solChange.toFixed(1)}%
            </span>}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: streamConnected ? (detecting ? "#10b981" : "#10b98180") : "#ef4444",
            animation: "dot-pulse 2s ease-in-out infinite" }} />
          <NotificationsBell isMobile onNavigate={() => setTab("scan")} />
          <button onClick={() => setTab("watchlist")}
            style={{ background: "transparent", border: "none",
              color: tab === "watchlist" ? "#f59e0b" : "#52525b",
              fontSize: 18, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", width: 36, height: 36, justifyContent: "center" }}>
            ★
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "home" && (
          <MHomeTab solPrice={solPrice} solChange={solChange} gems={gems} newIds={newIds}
            feedTrades={feedTrades} detecting={detecting} streamConnected={streamConnected}
            onSnipe={setSnipe} onWatch={handleWatch} watchlist={watchlist} />
        )}
        {tab === "scan" && (
          <MScanTab gems={gems} newIds={newIds} scanning={scanning}
            onScan={startScan} onSnipe={setSnipe} onWatch={handleWatch} watchlist={watchlist} />
        )}
        {tab === "kol" && (
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div style={{ padding: "9px 14px 5px", fontSize: 9, color: "#52525b", fontWeight: 700, letterSpacing: "1.5px", borderBottom: `1px solid ${BORDER}` }}>
              LIVE KOL TRADES · {feedTrades.length}
            </div>
            {feedTrades.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#3f3f46", fontSize: 12 }}>Waiting for KOL trades…</div>
            ) : feedTrades.map(t => <KolRow key={t.id} t={t} />)}
          </div>
        )}
        {tab === "trending" && (
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div style={{ padding: "9px 14px 5px", fontSize: 9, color: "#52525b", fontWeight: 700, letterSpacing: "1.5px", borderBottom: `1px solid ${BORDER}` }}>
              TRENDING TOKENS
            </div>
            {trendLoad ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#52525b", fontSize: 12 }}>Loading…</div>
            ) : trending.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#3f3f46", fontSize: 12 }}>No data.</div>
            ) : trending.map((t, i) => <TrendRow key={t.address} t={t} rank={i + 1} />)}
          </div>
        )}
        {tab === "watchlist" && <WatchlistTab isMobile />}
        {tab === "me" && (
          <div style={{ overflowY: "auto", flex: 1, padding: "14px 14px 88px" }}>
            <div style={{ background: "#0a0a0d", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: "#52525b", fontWeight: 700, letterSpacing: "1.5px", marginBottom: 10 }}>PHANTOM WALLET</div>
              <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 8, wordBreak: "break-all" }}>{wallet}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#f4f4f5" }}>{wBal ?? "—"}</span>
                  <span style={{ fontSize: 11, color: "#52525b", marginLeft: 6 }}>SOL</span>
                  {solPrice && wBal && (
                    <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>
                      ≈ ${(parseFloat(wBal) * solPrice).toFixed(2)}
                    </div>
                  )}
                </div>
                <button onClick={onDisconnect}
                  style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #ef444430",
                    background: "#ef444408", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Disconnect
                </button>
              </div>
            </div>
            <InternalWalletPanel iw={iw} />
          </div>
        )}
      </div>

      {/* ── Bottom nav ──────────────────────────── */}
      <nav style={{ height: 64, background: BG2, borderTop: `1px solid ${BORDER}`,
        display: "flex", alignItems: "stretch", flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
        {NAV_ITEMS.map(({ id, Icon, label }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 4,
                background: active ? `${ACCENT}10` : "transparent",
                border: "none", cursor: "pointer", color: active ? ACCENT : "#4a4a5a",
                borderTop: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                transition: "color .12s", minWidth: 0, padding: "0 4px" }}>
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {snipeGem && <SnipeModal gem={snipeGem} wallet={wallet} onClose={() => setSnipe(null)} />}
    </div>
  );
}
