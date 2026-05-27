"use client";

import React, { useState, useEffect, useCallback } from "react";
import { KOLS } from "@/lib/config";
import { useKolFeed } from "@/lib/useKolFeed";
import {
  IconGlobe, IconEye, IconNewspaper, IconBell, IconRefresh,
  IconX, IconArrowUpRight, IconTrendingUp, IconVerified,
} from "./icons";
import type { HeliusEnhancedTransaction } from "@/types/helius";

// ── Types ────────────────────────────────────────────────────────────────────

interface WatchedWallet {
  address: string;
  label:   string;
  addedAt: number;
}

interface WalletActivity {
  address:   string;
  txs:       HeliusEnhancedTransaction[];
  loading:   boolean;
  error:     string | null;
  fetchedAt: number | null;
}

interface NewsSignal {
  id:      string;
  text:    string;
  author:  string;
  url:     string;
  score:   number;
  icon:    string;
  pubDate: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "geass:social:watchlist";

function loadWatchlist(): WatchedWallet[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function saveWatchlist(list: WatchedWallet[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function shortAddr(a: string) {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

function fmtAgo(ts: number) {
  // ts is Unix seconds
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function swapLabel(tx: HeliusEnhancedTransaction): { action: string; label: string; color: string } {
  const ev = tx.events?.swap;
  if (ev) {
    const hasNativeIn  = ev.nativeInput  && Number(ev.nativeInput.amount)  > 0;
    const hasTokenIn   = (ev.tokenInputs?.length  ?? 0) > 0;
    const hasNativeOut = ev.nativeOutput && Number(ev.nativeOutput.amount) > 0;
    const hasTokenOut  = (ev.tokenOutputs?.length ?? 0) > 0;
    if ((hasNativeIn || hasTokenIn) && (hasNativeOut || hasTokenOut))
      return { action: "SWAP", label: tx.description?.slice(0, 70) ?? "Swap", color: "#a855f7" };
  }
  if (tx.type === "TRANSFER")   return { action: "TRANSFER",  label: tx.description?.slice(0, 70) ?? "Transfer",   color: "#3b82f6" };
  if (tx.type === "TOKEN_MINT") return { action: "MINT",      label: tx.description?.slice(0, 70) ?? "Token Mint", color: "#22c55e" };
  if (tx.type === "BURN")       return { action: "BURN",      label: tx.description?.slice(0, 70) ?? "Burn",       color: "#ef4444" };
  return { action: tx.type ?? "TX", label: tx.description?.slice(0, 70) ?? `${tx.signature.slice(0, 16)}…`, color: "#52525b" };
}

// ── Section tab button ────────────────────────────────────────────────────────

function SectionTab({
  label, icon, active, onClick,
}: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 14px", border: `1px solid ${active ? "#ff2b4e" : "#1e1e21"}`,
      borderBottom: active ? "1px solid #ff2b4e" : "1px solid transparent",
      background: active ? "#ff2b4e14" : "transparent",
      color: active ? "#ff2b4e" : "#52525b",
      fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
      fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
      transition: "color .15s, background .15s, border-color .15s",
      marginBottom: -1,
    }}>
      {icon} {label}
    </button>
  );
}

// ── Watched Wallets Panel ─────────────────────────────────────────────────────

function WatchlistPanel({ isMobile }: { isMobile: boolean }) {
  const [watchlist, setWatchlist] = useState<WatchedWallet[]>([]);
  const [activity,  setActivity]  = useState<Record<string, WalletActivity>>({});
  const [input,     setInput]     = useState("");
  const [labelIn,   setLabelIn]   = useState("");
  const [adding,    setAdding]    = useState(false);
  const [addErr,    setAddErr]    = useState("");

  useEffect(() => { setWatchlist(loadWatchlist()); }, []);

  const fetchActivity = useCallback(async (address: string) => {
    setActivity(prev => ({
      ...prev,
      [address]: { address, txs: prev[address]?.txs ?? [], loading: true, error: null, fetchedAt: null },
    }));
    try {
      const r = await fetch(`/api/helius/history/${address}?limit=5`, { cache: "no-store" });
      const data = await r.json() as { transactions?: HeliusEnhancedTransaction[]; error?: string };
      setActivity(prev => ({
        ...prev,
        [address]: { address, txs: data.transactions ?? [], loading: false, error: data.error ?? null, fetchedAt: Date.now() },
      }));
    } catch (e) {
      setActivity(prev => ({
        ...prev,
        [address]: { address, txs: [], loading: false, error: String(e), fetchedAt: null },
      }));
    }
  }, []);

  useEffect(() => {
    for (const w of watchlist) fetchActivity(w.address);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length]);

  const addWallet = () => {
    const addr = input.trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) { setAddErr("Invalid Solana address"); return; }
    if (watchlist.some(w => w.address === addr))       { setAddErr("Already watching");        return; }
    const updated = [...watchlist, { address: addr, label: labelIn.trim() || shortAddr(addr), addedAt: Date.now() }];
    setWatchlist(updated); saveWatchlist(updated);
    setInput(""); setLabelIn(""); setAddErr(""); setAdding(false);
    fetchActivity(addr);
  };

  const removeWallet = (address: string) => {
    const updated = watchlist.filter(w => w.address !== address);
    setWatchlist(updated); saveWatchlist(updated);
    setActivity(prev => { const n = { ...prev }; delete n[address]; return n; });
  };

  const inp: React.CSSProperties = {
    background: "#0a0a0c", border: "1px solid #1e1e21", color: "#f4f4f5",
    padding: "8px 10px", fontSize: 11, outline: "none",
    fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace", width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      {/* Add wallet form */}
      <div style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#52525b", marginBottom: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Watch a wallet
        </div>
        {adding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input value={input} onChange={e => { setInput(e.target.value); setAddErr(""); }}
              placeholder="Solana wallet address" style={inp}
              onKeyDown={e => e.key === "Enter" && addWallet()} autoFocus />
            <input value={labelIn} onChange={e => setLabelIn(e.target.value)}
              placeholder="Label (optional, e.g. Whale #1)" style={inp} />
            {addErr && <div style={{ fontSize: 11, color: "#ef4444" }}>{addErr}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={addWallet} style={{
                background: "#ff2b4e", border: "none", color: "#fff",
                padding: "7px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                fontFamily: "'JetBrains Mono',monospace",
              }}>Add</button>
              <button onClick={() => { setAdding(false); setAddErr(""); }} style={{
                background: "transparent", border: "1px solid #27272a", color: "#71717a",
                padding: "7px 14px", fontSize: 11, cursor: "pointer",
                fontFamily: "'JetBrains Mono',monospace",
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{
            background: "transparent", border: "1px solid #27272a", color: "#71717a",
            padding: "7px 14px", fontSize: 11, cursor: "pointer",
            fontFamily: "'JetBrains Mono',monospace", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add wallet
          </button>
        )}
      </div>

      {/* Empty state */}
      {watchlist.length === 0 && (
        <>
          <div style={{ textAlign: "center", padding: "32px 0 24px", color: "#3f3f46", fontSize: 12 }}>
            <IconEye size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.25 }} />
            No wallets watched yet. Add any Solana address to track its activity.
          </div>
          {/* KOL quick-add */}
          <div>
            <div style={{ fontSize: 10, color: "#3f3f46", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Quick-add KOL wallets
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {KOLS.map(k => (
                <button key={k.addr} onClick={() => {
                  if (watchlist.some(w => w.address === k.addr)) return;
                  const updated = [...watchlist, { address: k.addr, label: k.name, addedAt: Date.now() }];
                  setWatchlist(updated); saveWatchlist(updated); fetchActivity(k.addr);
                }} style={{
                  background: "transparent", border: `1px solid ${k.c}44`,
                  color: k.c, padding: "5px 10px", fontSize: 10, cursor: "pointer",
                  fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
                }}>
                  {k.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Wallet cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {watchlist.map(w => {
          const act = activity[w.address];
          return (
            <div key={w.address} style={{ background: "#0d0d10", border: "1px solid #1e1e21" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #1a1a1e" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>{w.label}</span>
                  <span style={{ fontSize: 10, color: "#52525b" }}>{shortAddr(w.address)}</span>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => fetchActivity(w.address)}
                    title="Refresh" style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", padding: "3px 5px" }}>
                    <IconRefresh size={11} />
                  </button>
                  <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer"
                    title="Solscan" style={{ color: "#52525b", display: "flex", alignItems: "center", padding: "3px 5px" }}>
                    <IconArrowUpRight size={11} />
                  </a>
                  <button onClick={() => removeWallet(w.address)}
                    title="Remove" style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", padding: "3px 5px" }}>
                    <IconX size={11} />
                  </button>
                </div>
              </div>
              <div style={{ padding: "8px 14px" }}>
                {act?.loading && <div style={{ fontSize: 11, color: "#52525b", padding: "6px 0" }}>Loading…</div>}
                {!act?.loading && act?.error && <div style={{ fontSize: 11, color: "#ef4444", padding: "6px 0" }}>Error: {act.error}</div>}
                {!act?.loading && !act?.error && !act?.txs.length && (
                  <div style={{ fontSize: 11, color: "#3f3f46", padding: "6px 0" }}>No recent activity found.</div>
                )}
                {(act?.txs ?? []).map((tx, i) => {
                  const { action, label, color } = swapLabel(tx);
                  return (
                    <div key={tx.signature + i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 0", borderBottom: i < (act?.txs.length ?? 0) - 1 ? "1px solid #111114" : "none",
                      fontSize: 11,
                    }}>
                      <span style={{
                        padding: "1px 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0,
                        background: `${color}18`, color, border: `1px solid ${color}44`,
                      }}>{action}</span>
                      <span style={{ color: "#a1a1aa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                      {tx.timestamp && <span style={{ color: "#3f3f46", flexShrink: 0 }}>{fmtAgo(tx.timestamp)}</span>}
                      <a href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noreferrer"
                        style={{ color: "#3f3f46", flexShrink: 0, display: "flex" }}>
                        <IconArrowUpRight size={10} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Alpha News Panel ──────────────────────────────────────────────────────────

function AlphaNewsPanel() {
  const [signals,   setSignals]   = useState<NewsSignal[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const r    = await fetch("/api/trends/x-signals", { cache: "no-store" });
      const data = await r.json() as { signals: NewsSignal[] };
      setSignals(data.signals ?? []);
      setFetchedAt(Date.now());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          Alpha Signals · {signals.length} articles
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {fetchedAt && (
            <span style={{ fontSize: 10, color: "#3f3f46" }}>
              updated {Math.floor((Date.now() - fetchedAt) / 1000)}s ago
            </span>
          )}
          <button onClick={fetchSignals} disabled={loading} style={{
            background: "transparent", border: "1px solid #27272a", color: loading ? "#3f3f46" : "#71717a",
            padding: "5px 10px", fontSize: 10, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "'JetBrains Mono',monospace", display: "flex", alignItems: "center", gap: 4,
          }}>
            <IconRefresh size={10} /> Refresh
          </button>
        </div>
      </div>

      {loading && !signals.length && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 12 }}>
          Fetching alpha signals…
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {signals.map(sig => (
          <a key={sig.id} href={sig.url} target="_blank" rel="noreferrer"
            style={{ textDecoration: "none" }}>
            <div style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "12px 14px", transition: "border-color .15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a30")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e1e21")}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.2 }}>{sig.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#f4f4f5", lineHeight: 1.45, marginBottom: 5 }}>{sig.text}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "#52525b" }}>{sig.author}</span>
                    <span style={{ fontSize: 10, color: "#3f3f46" }}>·</span>
                    <span style={{ fontSize: 10, color: "#3f3f46" }}>
                      {sig.pubDate ? `${fmtAgo(Math.floor(sig.pubDate / 1000))} ago` : "—"}
                    </span>
                    <div style={{ flex: 1, minWidth: 40, height: 2, background: "#18181c", overflow: "hidden" }}>
                      <div style={{
                        width: `${sig.score}%`, height: "100%",
                        background: sig.score >= 60 ? "#ff2b4e" : sig.score >= 40 ? "#f97316" : "#52525b",
                      }} />
                    </div>
                    <span style={{ fontSize: 9, color: sig.score >= 60 ? "#ff2b4e" : "#52525b", fontWeight: 700 }}>
                      {sig.score}
                    </span>
                  </div>
                </div>
                <IconArrowUpRight size={12} style={{ flexShrink: 0, color: "#3f3f46", marginTop: 2 }} />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── KOL Activity Panel ────────────────────────────────────────────────────────

function KolActivityPanel() {
  const trades = useKolFeed();

  return (
    <div>
      {/* Live indicator + count */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div className="live-dot" style={{ background: "#22c55e" }} />
        <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          KOL Live Feed
        </span>
        <span style={{ fontSize: 10, color: "#3f3f46" }}>· {trades.length} events</span>
      </div>

      {/* KOL cards row */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 16, scrollbarWidth: "none" }}>
        {KOLS.map(k => (
          <a key={k.addr} href={`https://twitter.com/${k.tw}`} target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              background: "#0d0d10", border: `1px solid ${k.c}33`, padding: "8px 12px",
              display: "flex", flexDirection: "column", gap: 2, minWidth: 84,
              transition: "border-color .15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${k.c}77`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = `${k.c}33`)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: k.c }}>{k.name}</span>
                <IconVerified size={9} />
              </div>
              <div style={{ fontSize: 9, color: "#52525b" }}>WR {k.wr}%</div>
              <div style={{ fontSize: 9, color: "#22c55e", fontWeight: 700 }}>{k.pnl}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Trade stream */}
      {trades.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 12 }}>
          <IconBell size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.25 }} />
          Waiting for live KOL trades…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {trades.map(t => (
            <div key={t.id} style={{
              background: "#0d0d10", border: "1px solid #1e1e21", padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: `${t.kolC}1a`, border: `1px solid ${t.kolC}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: t.kolC, flexShrink: 0,
              }}>
                {t.kol.slice(0, 2).toUpperCase()}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.kolC }}>{t.kol}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px",
                    background: t.type === "buy" ? "#22c55e18" : "#ef444418",
                    color:      t.type === "buy" ? "#22c55e"   : "#ef4444",
                    border:     `1px solid ${t.type === "buy" ? "#22c55e44" : "#ef444444"}`,
                  }}>{t.type.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: "#f4f4f5", fontWeight: 600 }}>${t.sym}</span>
                </div>
                <div style={{ fontSize: 10, color: "#52525b" }}>{t.sol} SOL · {t.tokAmt} tokens</div>
              </div>
              {/* Time + DEX link */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "#3f3f46" }}>
                  {t.ago < 60 ? `${t.ago}s` : t.ago < 3600 ? `${Math.floor(t.ago / 60)}m` : `${Math.floor(t.ago / 3600)}h`}
                </span>
                {t.mint && (
                  <a href={`https://dexscreener.com/solana/${t.mint}`} target="_blank" rel="noreferrer"
                    style={{ color: "#3f3f46", display: "flex" }}>
                    <IconArrowUpRight size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

type SocialSubTab = "wallets" | "news" | "kol";

interface SocialTrackerTabProps {
  wallet:   string;
  isMobile: boolean;
}

export function SocialTrackerTab({ wallet: _wallet, isMobile }: SocialTrackerTabProps) {
  const [activeTab, setActiveTab] = useState<SocialSubTab>("wallets");

  const tabs: { id: SocialSubTab; label: string; icon: React.ReactNode }[] = [
    { id: "wallets", label: "Wallets",    icon: <IconEye       size={11} /> },
    { id: "news",    label: "Alpha News", icon: <IconNewspaper size={11} /> },
    { id: "kol",     label: "KOL Feed",   icon: <IconTrendingUp size={11} /> },
  ];

  return (
    <div style={{
      maxWidth: 760, margin: "0 auto",
      padding: isMobile ? "14px 12px 80px" : "20px 0 40px",
      fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5",
          display: "flex", alignItems: "center", gap: 8, margin: 0, marginBottom: 4,
        }}>
          <IconGlobe size={isMobile ? 16 : 18} style={{ color: "#ff2b4e" }} />
          Social Tracker
        </h1>
        <p style={{ fontSize: 11, color: "#3f3f46", margin: 0 }}>
          Watch wallets · Alpha news · KOL live feed
        </p>
      </div>

      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e1e21", marginBottom: 20 }}>
        {tabs.map(t => (
          <SectionTab
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          />
        ))}
      </div>

      {/* Active panel */}
      {activeTab === "wallets" && <WatchlistPanel isMobile={isMobile} />}
      {activeTab === "news"    && <AlphaNewsPanel />}
      {activeTab === "kol"     && <KolActivityPanel />}
    </div>
  );
}
