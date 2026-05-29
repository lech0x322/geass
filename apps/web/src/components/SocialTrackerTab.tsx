"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { KOLS } from "@/lib/config";
import { useKolFeed } from "@/lib/useKolFeed";
import { KolScanPanel } from "./KolScanPanel";
import {
  IconGlobe, IconEye, IconNewspaper, IconBell, IconRefresh,
  IconX, IconArrowUpRight, IconTrendingUp, IconVerified, IconRocket,
} from "./icons";
import type { HeliusEnhancedTransaction } from "@/types/helius";
import type { XTweet } from "@/app/api/social/feed/route";

// ── Types ────────────────────────────────────────────────────────────────────

export type AccountCategory = "KOL" | "Trader" | "Whale" | "Exchange" | "Media" | "Politics" | "Founders" | "Others";

export interface XAccount {
  handle:      string;
  displayName: string;
  category:    AccountCategory;
  followers?:  string;
  verified?:   boolean;
  addedAt:     number;
}

const ALL_CATEGORIES: AccountCategory[] = ["KOL", "Trader", "Whale", "Exchange", "Media", "Politics", "Founders", "Others"];

const CAT_COLORS: Record<AccountCategory, string> = {
  KOL:       "#ff2b4e",
  Trader:    "#f97316",
  Whale:     "#a855f7",
  Exchange:  "#3b82f6",
  Media:     "#06b6d4",
  Politics:  "#84cc16",
  Founders:  "#eab308",
  Others:    "#52525b",
};

// ── Pre-curated top accounts ──────────────────────────────────────────────────

const TOP_ACCOUNTS: XAccount[] = [
  { handle: "muradmahmudov",   displayName: "Murad",           category: "KOL",      followers: "350K",  verified: true,  addedAt: 0 },
  { handle: "blknoiz06",       displayName: "Ansem",           category: "KOL",      followers: "420K",  verified: true,  addedAt: 0 },
  { handle: "HsakaTrades",     displayName: "Hsaka",           category: "Trader",   followers: "290K",  verified: true,  addedAt: 0 },
  { handle: "cobie",           displayName: "Cobie",           category: "KOL",      followers: "680K",  verified: true,  addedAt: 0 },
  { handle: "lookonchain",     displayName: "Lookonchain",     category: "Whale",    followers: "490K",  verified: true,  addedAt: 0 },
  { handle: "DegenSpartan",    displayName: "Degen Spartan",   category: "Trader",   followers: "185K",  verified: false, addedAt: 0 },
  { handle: "CryptoHayes",     displayName: "Arthur Hayes",    category: "KOL",      followers: "680K",  verified: true,  addedAt: 0 },
  { handle: "binance",         displayName: "Binance",         category: "Exchange", followers: "12.8M", verified: true,  addedAt: 0 },
  { handle: "cointelegraph",   displayName: "CoinTelegraph",   category: "Media",    followers: "3.4M",  verified: true,  addedAt: 0 },
  { handle: "solana",          displayName: "Solana",          category: "Others",   followers: "2.1M",  verified: true,  addedAt: 0 },
  { handle: "pumpdotfun",      displayName: "pump.fun",        category: "Others",   followers: "190K",  verified: false, addedAt: 0 },
  { handle: "RaydiumProtocol", displayName: "Raydium",         category: "Exchange", followers: "280K",  verified: true,  addedAt: 0 },
  { handle: "inversebrah",     displayName: "inversebrah",     category: "KOL",      followers: "120K",  verified: false, addedAt: 0 },
  { handle: "0xMert_",         displayName: "Mert",            category: "Founders", followers: "95K",   verified: true,  addedAt: 0 },
  { handle: "rajgokal",        displayName: "Raj Gokal",       category: "Founders", followers: "145K",  verified: true,  addedAt: 0 },
  { handle: "aeyakovenko",     displayName: "toly",            category: "Founders", followers: "390K",  verified: true,  addedAt: 0 },
  { handle: "Pentosh1",        displayName: "Pentoshi",        category: "Trader",   followers: "170K",  verified: true,  addedAt: 0 },
  { handle: "GiganticRebirth", displayName: "GCR",             category: "Trader",   followers: "260K",  verified: false, addedAt: 0 },
  { handle: "CoinGecko",       displayName: "CoinGecko",       category: "Media",    followers: "2.2M",  verified: true,  addedAt: 0 },
  { handle: "DegenerateNews",  displayName: "Degenerate News", category: "Media",    followers: "55K",   verified: false, addedAt: 0 },
];

// ── LocalStorage helpers ──────────────────────────────────────────────────────

const MY_LIST_KEY   = "geass:social:mylist";
const BLACK_KEY     = "geass:social:blacklist";
const WATCHLIST_KEY = "geass:social:watchlist";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

function saveJSON(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

function fmtAgo(ms: number) {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function shortAddr(a: string) {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
};

const BTN_BASE: React.CSSProperties = {
  ...MONO, border: "none", cursor: "pointer", fontSize: 11,
  padding: "6px 12px", fontWeight: 600, transition: "opacity .15s",
};

const INP: React.CSSProperties = {
  ...MONO, background: "#0a0a0c", border: "1px solid #1e1e21",
  color: "#f4f4f5", padding: "7px 10px", fontSize: 11, outline: "none",
  width: "100%", boxSizing: "border-box",
};

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({
  label, active, onClick, count,
}: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} style={{
      ...MONO, display: "flex", alignItems: "center", gap: 5,
      padding: "8px 14px", fontSize: 11, fontWeight: active ? 700 : 500,
      cursor: "pointer", color: active ? "#ff2b4e" : "#52525b",
      background: active ? "#ff2b4e14" : "transparent",
      border: `1px solid ${active ? "#ff2b4e" : "#1e1e21"}`,
      borderBottom: active ? "1px solid #ff2b4e" : "1px solid transparent",
      marginBottom: -1, transition: "color .15s, background .15s, border-color .15s",
    }}>
      {label}
      {count !== undefined && (
        <span style={{ background: active ? "#ff2b4e" : "#27272a", color: active ? "#fff" : "#71717a", fontSize: 9, padding: "1px 5px", fontWeight: 700, borderRadius: 2 }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Category pill ─────────────────────────────────────────────────────────────

function CatPill({ cat, active, onClick }: { cat: string; active: boolean; onClick: () => void }) {
  const c = CAT_COLORS[cat as AccountCategory] ?? "#52525b";
  return (
    <button onClick={onClick} style={{
      ...MONO, fontSize: 10, fontWeight: active ? 700 : 500, cursor: "pointer",
      padding: "4px 10px", border: `1px solid ${active ? c : "#1e1e21"}`,
      background: active ? `${c}18` : "transparent", color: active ? c : "#52525b",
      transition: "color .15s, border-color .15s, background .15s",
    }}>{cat}</button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// X TRACKER PANEL
// ══════════════════════════════════════════════════════════════════════════════

type XTrackerTab = "feed" | "mylist" | "top" | "blacklist";

function XTrackerPanel({ isMobile }: { isMobile: boolean }) {
  const [myList,    setMyListState]    = useState<XAccount[]>(() => loadJSON(MY_LIST_KEY, []));
  const [blacklist, setBlacklistState] = useState<XAccount[]>(() => loadJSON(BLACK_KEY, []));

  const [xTab,        setXTab]        = useState<XTrackerTab>("mylist");
  const [catFilter,   setCatFilter]   = useState<AccountCategory | "All">("All");
  const [tweets,      setTweets]      = useState<XTweet[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [fetchedAt,   setFetchedAt]   = useState<number | null>(null);
  const [noRT,        setNoRT]        = useState(true);

  const [addHandle, setAddHandle] = useState("");
  const [addCat,    setAddCat]    = useState<AccountCategory>("KOL");
  const [addName,   setAddName]   = useState("");
  const [addErr,    setAddErr]    = useState("");
  const [showForm,  setShowForm]  = useState(false);

  const feedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Persist helpers ──────────────────────────────────────────────────────────

  const setMyList = useCallback((fn: (p: XAccount[]) => XAccount[]) => {
    setMyListState(prev => { const next = fn(prev); saveJSON(MY_LIST_KEY, next); return next; });
  }, []);

  const setBlacklist = useCallback((fn: (p: XAccount[]) => XAccount[]) => {
    setBlacklistState(prev => { const next = fn(prev); saveJSON(BLACK_KEY, next); return next; });
  }, []);

  // ── Feed ─────────────────────────────────────────────────────────────────────

  const fetchFeed = useCallback(async (list?: XAccount[], bl?: XAccount[]) => {
    const activeList  = list      ?? myList;
    const activeBlack = bl        ?? blacklist;
    if (!activeList.length) { setTweets([]); return; }
    const blackSet = new Set(activeBlack.map(b => b.handle.toLowerCase()));
    const handles  = activeList.filter(a => !blackSet.has(a.handle.toLowerCase())).map(a => a.handle);
    if (!handles.length) { setTweets([]); return; }
    setFeedLoading(true);
    try {
      const r = await fetch(`/api/social/feed?handles=${encodeURIComponent(handles.join(","))}&limit=80&noRT=${noRT ? "1" : "0"}`, { cache: "no-store" });
      const d = await r.json() as { tweets: XTweet[]; fetchedAt: number };
      setTweets(d.tweets ?? []);
      setFetchedAt(d.fetchedAt);
    } catch { /* silent */ }
    setFeedLoading(false);
  }, [myList, blacklist, noRT]);

  useEffect(() => {
    fetchFeed();
    if (feedTimerRef.current) clearInterval(feedTimerRef.current);
    feedTimerRef.current = setInterval(() => fetchFeed(), 180_000);
    return () => { if (feedTimerRef.current) clearInterval(feedTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myList.length, blacklist.length, noRT]);

  // ── Account helpers ──────────────────────────────────────────────────────────

  const subscribe = useCallback((acc: XAccount) => {
    setMyList(prev => {
      if (prev.some(a => a.handle.toLowerCase() === acc.handle.toLowerCase())) return prev;
      return [...prev, { ...acc, addedAt: Date.now() }];
    });
  }, [setMyList]);

  const unsubscribe = useCallback((handle: string) => {
    setMyList(prev => prev.filter(a => a.handle.toLowerCase() !== handle.toLowerCase()));
  }, [setMyList]);

  const blacklistAdd = useCallback((acc: XAccount) => {
    unsubscribe(acc.handle);
    setBlacklist(prev => {
      if (prev.some(b => b.handle.toLowerCase() === acc.handle.toLowerCase())) return prev;
      return [...prev, { ...acc, addedAt: Date.now() }];
    });
  }, [unsubscribe, setBlacklist]);

  const blacklistRemove = useCallback((handle: string) => {
    setBlacklist(prev => prev.filter(b => b.handle.toLowerCase() !== handle.toLowerCase()));
  }, [setBlacklist]);

  const addCustom = useCallback(() => {
    const h = addHandle.trim().replace(/^@/, "");
    if (!h) { setAddErr("Handle required"); return; }
    if (myList.some(a => a.handle.toLowerCase() === h.toLowerCase())) { setAddErr("Already in My List"); return; }
    subscribe({ handle: h, displayName: addName.trim() || h, category: addCat, addedAt: Date.now() });
    setAddHandle(""); setAddName(""); setAddErr(""); setShowForm(false);
  }, [addHandle, addName, addCat, myList, subscribe]);

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const filteredMyList  = catFilter === "All" ? myList       : myList.filter(a => a.category === catFilter);
  const filteredTopList = catFilter === "All" ? TOP_ACCOUNTS : TOP_ACCOUNTS.filter(a => a.category === catFilter);
  const filteredTweets  = catFilter === "All" ? tweets : (() => {
    const hs = new Set(myList.filter(a => a.category === catFilter).map(a => a.handle.toLowerCase()));
    return tweets.filter(t => hs.has(t.handle.toLowerCase()));
  })();

  // ── Account row ───────────────────────────────────────────────────────────────

  const AccountRow = ({
    acc, showAdd, showRemove, showBlacklist, showUnblacklist,
  }: {
    acc: XAccount;
    showAdd?: boolean; showRemove?: boolean; showBlacklist?: boolean; showUnblacklist?: boolean;
  }) => {
    const inList = myList.some(a => a.handle.toLowerCase() === acc.handle.toLowerCase());
    const c = CAT_COLORS[acc.category];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: "1px solid #111114" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: `${c}1a`, border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: c }}>
          {acc.displayName.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5", ...MONO }}>
              {acc.displayName}
            </span>
            {acc.verified && <IconVerified size={9} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10, color: "#52525b" }}>@{acc.handle}</span>
            {acc.followers && <span style={{ fontSize: 10, color: "#3f3f46" }}>· {acc.followers}</span>}
          </div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", background: `${c}18`, color: c, border: `1px solid ${c}44`, ...MONO, flexShrink: 0 }}>
          {acc.category}
        </span>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {showAdd && !inList && (
            <button onClick={() => subscribe(acc)} title="Subscribe" style={{ ...BTN_BASE, background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e44", padding: "3px 7px" }}>+</button>
          )}
          {showAdd && inList && (
            <span style={{ fontSize: 9, color: "#22c55e", padding: "3px 7px" }}>✓</span>
          )}
          {showRemove && (
            <button onClick={() => unsubscribe(acc.handle)} title="Remove" style={{ ...BTN_BASE, background: "transparent", color: "#52525b", border: "1px solid #27272a", padding: "3px 7px" }}>−</button>
          )}
          {showBlacklist && (
            <button onClick={() => blacklistAdd(acc)} title="Blacklist" style={{ ...BTN_BASE, background: "#ef444418", color: "#ef4444", border: "1px solid #ef444444", padding: "3px 7px", fontSize: 9 }}>🚫</button>
          )}
          {showUnblacklist && (
            <button onClick={() => blacklistRemove(acc.handle)} title="Remove from blacklist" style={{ ...BTN_BASE, background: "transparent", color: "#52525b", border: "1px solid #27272a", padding: "3px 7px" }}>✕</button>
          )}
          <a href={`https://twitter.com/${acc.handle}`} target="_blank" rel="noreferrer" style={{ color: "#3f3f46", display: "flex", alignItems: "center", padding: "3px 5px" }}>
            <IconArrowUpRight size={10} />
          </a>
        </div>
      </div>
    );
  };

  // ── Tweet card ─────────────────────────────────────────────────────────────────

  const TweetCard = ({ tweet }: { tweet: XTweet }) => {
    const acc = myList.find(a => a.handle.toLowerCase() === tweet.handle.toLowerCase());
    const c   = acc ? CAT_COLORS[acc.category] : "#52525b";
    return (
      <div style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "12px 14px", marginBottom: 5, transition: "border-color .15s" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a30")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e1e21")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: `${c}1a`, border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: c }}>
            {tweet.handle.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5", ...MONO }}>@{tweet.handle}</span>
              {acc && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", background: `${c}18`, color: c, border: `1px solid ${c}44` }}>{acc.category}</span>}
              {tweet.isRT && <span style={{ fontSize: 8, color: "#52525b", padding: "1px 5px", border: "1px solid #27272a" }}>RT</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#3f3f46", ...MONO }}>{fmtAgo(tweet.pubDate)}</span>
            <a href={tweet.url} target="_blank" rel="noreferrer" style={{ color: "#3f3f46", display: "flex", alignItems: "center" }}>
              <IconArrowUpRight size={11} />
            </a>
          </div>
        </div>
        <p style={{ ...MONO, fontSize: 11, color: "#a1a1aa", lineHeight: 1.55, margin: 0, marginBottom: tweet.cas.length ? 10 : 0, wordBreak: "break-word" }}>
          {tweet.text}
        </p>
        {tweet.cas.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {tweet.cas.map(ca => (
              <div key={ca} style={{ display: "flex", alignItems: "center", gap: 4, background: "#ff2b4e0d", border: "1px solid #ff2b4e33", padding: "3px 8px" }}>
                <span style={{ fontSize: 9, color: "#ff2b4e", fontWeight: 700, ...MONO }}>CA</span>
                <span style={{ fontSize: 9, color: "#a1a1aa", ...MONO }}>{shortAddr(ca)}</span>
                <a href={`https://dexscreener.com/solana/${ca}`} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontSize: 9, textDecoration: "none", ...MONO }}>DEX</a>
                <a href={`https://solscan.io/token/${ca}`} target="_blank" rel="noreferrer" style={{ color: "#52525b", display: "flex", alignItems: "center" }}>
                  <IconArrowUpRight size={9} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Add form (shared) ─────────────────────────────────────────────────────────

  const AddForm = () => (
    <div style={{ padding: "10px 12px", borderBottom: "1px solid #111114" }}>
      {showForm ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input value={addHandle} onChange={e => { setAddHandle(e.target.value); setAddErr(""); }}
            placeholder="@handle" style={INP}
            onKeyDown={e => e.key === "Enter" && addCustom()} autoFocus />
          <input value={addName} onChange={e => setAddName(e.target.value)}
            placeholder="Display name (optional)" style={INP} />
          <select value={addCat} onChange={e => setAddCat(e.target.value as AccountCategory)} style={{ ...INP, cursor: "pointer" }}>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {addErr && <div style={{ fontSize: 11, color: "#ef4444" }}>{addErr}</div>}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={addCustom} style={{ ...BTN_BASE, background: "#ff2b4e", color: "#fff", border: "none" }}>Add</button>
            <button onClick={() => { setShowForm(false); setAddErr(""); }} style={{ ...BTN_BASE, background: "transparent", color: "#71717a", border: "1px solid #27272a" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{ ...BTN_BASE, background: "transparent", color: "#52525b", border: "1px solid #27272a", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>+</span> Add @handle
        </button>
      )}
    </div>
  );

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

      {/* LEFT: Tweet feed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Feed toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Live Feed</span>
          <span style={{ fontSize: 10, color: "#3f3f46" }}>· {filteredTweets.length}</span>
          <div style={{ flex: 1 }} />
          {fetchedAt && <span style={{ fontSize: 10, color: "#3f3f46" }}>{Math.floor((Date.now() - fetchedAt) / 1000)}s ago</span>}
          <button onClick={() => setNoRT(v => !v)} style={{ ...BTN_BASE, fontSize: 10, padding: "4px 9px", background: noRT ? "#ff2b4e14" : "transparent", color: noRT ? "#ff2b4e" : "#52525b", border: `1px solid ${noRT ? "#ff2b4e" : "#27272a"}` }}>
            Hide RT
          </button>
          <button onClick={() => fetchFeed()} disabled={feedLoading} style={{ ...BTN_BASE, background: "transparent", border: "1px solid #27272a", color: feedLoading ? "#3f3f46" : "#71717a", padding: "4px 9px", display: "flex", alignItems: "center", gap: 4 }}>
            <IconRefresh size={10} /> Refresh
          </button>
        </div>

        {myList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46" }}>
            <IconGlobe size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.2 }} />
            <div style={{ fontSize: 12, marginBottom: 6 }}>No accounts subscribed yet</div>
            <div style={{ fontSize: 11 }}>Add handles from Top Accounts or use the + button</div>
          </div>
        ) : feedLoading && !tweets.length ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46", fontSize: 11 }}>Fetching tweets…</div>
        ) : filteredTweets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 11 }}>No tweets for selected filter</div>
        ) : (
          filteredTweets.map(t => <TweetCard key={t.id} tweet={t} />)
        )}
      </div>

      {/* RIGHT: Account management panel */}
      {!isMobile && (
        <div style={{ width: 310, flexShrink: 0, background: "#0a0a0c", border: "1px solid #1e1e21" }}>
          {/* Header */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e21" }}>
            <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
              X Tracker
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {([
                { id: "mylist",    label: "My List",   count: myList.length },
                { id: "top",       label: "Top",        count: TOP_ACCOUNTS.length },
                { id: "blacklist", label: "Block",      count: blacklist.length },
              ] as const).map(t => (
                <TabBtn key={t.id} label={t.label} count={t.count}
                  active={xTab === t.id} onClick={() => setXTab(t.id as XTrackerTab)} />
              ))}
            </div>
          </div>

          {/* Category filters */}
          <div style={{ display: "flex", gap: 4, padding: "8px 10px", flexWrap: "wrap", borderBottom: "1px solid #111114" }}>
            <CatPill cat="All" active={catFilter === "All"} onClick={() => setCatFilter("All")} />
            {ALL_CATEGORIES.map(c => (
              <CatPill key={c} cat={c} active={catFilter === c} onClick={() => setCatFilter(c)} />
            ))}
          </div>

          {/* My List */}
          {xTab === "mylist" && (
            <div>
              <AddForm />
              {filteredMyList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 14px", color: "#3f3f46", fontSize: 11 }}>
                  {catFilter === "All" ? "No subscriptions yet" : `No ${catFilter} accounts`}
                </div>
              ) : (
                filteredMyList.map(acc => <AccountRow key={acc.handle} acc={acc} showRemove showBlacklist />)
              )}
            </div>
          )}

          {/* Top Accounts */}
          {xTab === "top" && (
            <div>
              {filteredTopList.map(acc => <AccountRow key={acc.handle} acc={acc} showAdd showBlacklist />)}
            </div>
          )}

          {/* Blacklist */}
          {xTab === "blacklist" && (
            <div>
              {blacklist.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 14px", color: "#3f3f46", fontSize: 11 }}>Blacklist is empty</div>
              ) : (
                blacklist.map(acc => <AccountRow key={acc.handle} acc={acc} showUnblacklist />)
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile: bottom sheet tracker panel */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 60, left: 0, right: 0, background: "#0a0a0c", borderTop: "1px solid #1e1e21", zIndex: 50, maxHeight: "45vh", overflowY: "auto" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #1e1e21" }}>
            {([
              { id: "mylist",    label: "My List" },
              { id: "top",       label: "Top" },
              { id: "blacklist", label: "Block" },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setXTab(t.id as XTrackerTab)} style={{
                ...MONO, flex: 1, padding: "9px 4px", fontSize: 9, fontWeight: xTab === t.id ? 700 : 500,
                color: xTab === t.id ? "#ff2b4e" : "#52525b", background: "transparent",
                border: "none", borderBottom: `2px solid ${xTab === t.id ? "#ff2b4e" : "transparent"}`,
                cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {t.label}
              </button>
            ))}
          </div>
          {xTab === "mylist" && (
            <div>
              <AddForm />
              {myList.map(acc => <AccountRow key={acc.handle} acc={acc} showRemove showBlacklist />)}
            </div>
          )}
          {xTab === "top" && TOP_ACCOUNTS.map(acc => <AccountRow key={acc.handle} acc={acc} showAdd />)}
          {xTab === "blacklist" && (
            blacklist.length === 0
              ? <div style={{ textAlign: "center", padding: "20px", color: "#3f3f46", fontSize: 11 }}>Blacklist is empty</div>
              : blacklist.map(acc => <AccountRow key={acc.handle} acc={acc} showUnblacklist />)
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WALLET WATCHLIST PANEL
// ══════════════════════════════════════════════════════════════════════════════

interface WatchedWallet { address: string; label: string; addedAt: number; }
interface WalletActivity {
  address: string; txs: HeliusEnhancedTransaction[];
  loading: boolean; error: string | null; fetchedAt: number | null;
}

function swapLabel(tx: HeliusEnhancedTransaction): { action: string; label: string; color: string } {
  const ev = tx.events?.swap;
  if (ev) {
    const hasIn  = (ev.nativeInput && Number(ev.nativeInput.amount) > 0) || (ev.tokenInputs?.length ?? 0) > 0;
    const hasOut = (ev.nativeOutput && Number(ev.nativeOutput.amount) > 0) || (ev.tokenOutputs?.length ?? 0) > 0;
    if (hasIn && hasOut) return { action: "SWAP", label: tx.description?.slice(0, 70) ?? "Swap", color: "#a855f7" };
  }
  if (tx.type === "TRANSFER")   return { action: "TRANSFER", label: tx.description?.slice(0, 70) ?? "Transfer",   color: "#3b82f6" };
  if (tx.type === "TOKEN_MINT") return { action: "MINT",     label: tx.description?.slice(0, 70) ?? "Token Mint", color: "#22c55e" };
  if (tx.type === "BURN")       return { action: "BURN",     label: tx.description?.slice(0, 70) ?? "Burn",       color: "#ef4444" };
  return { action: tx.type ?? "TX", label: tx.description?.slice(0, 70) ?? `${tx.signature.slice(0, 16)}…`, color: "#52525b" };
}

function WatchlistPanel({ isMobile: _isMobile }: { isMobile: boolean }) {
  const [watchlist, setWatchlist] = useState<WatchedWallet[]>(() => loadJSON(WATCHLIST_KEY, []));
  const [activity,  setActivity]  = useState<Record<string, WalletActivity>>({});
  const [input,     setInput]     = useState("");
  const [labelIn,   setLabelIn]   = useState("");
  const [adding,    setAdding]    = useState(false);
  const [addErr,    setAddErr]    = useState("");

  const saveList = (list: WatchedWallet[]) => { setWatchlist(list); saveJSON(WATCHLIST_KEY, list); };

  const fetchActivity = useCallback(async (address: string) => {
    setActivity(prev => ({ ...prev, [address]: { address, txs: prev[address]?.txs ?? [], loading: true, error: null, fetchedAt: null } }));
    try {
      const r = await fetch(`/api/helius/history/${address}?limit=5`, { cache: "no-store" });
      const d = await r.json() as { transactions?: HeliusEnhancedTransaction[]; error?: string };
      setActivity(prev => ({ ...prev, [address]: { address, txs: d.transactions ?? [], loading: false, error: d.error ?? null, fetchedAt: Date.now() } }));
    } catch (e) {
      setActivity(prev => ({ ...prev, [address]: { address, txs: [], loading: false, error: String(e), fetchedAt: null } }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { for (const w of watchlist) fetchActivity(w.address); }, [watchlist.length]);

  const addWallet = () => {
    const addr = input.trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) { setAddErr("Invalid Solana address"); return; }
    if (watchlist.some(w => w.address === addr)) { setAddErr("Already watching"); return; }
    const updated = [...watchlist, { address: addr, label: labelIn.trim() || shortAddr(addr), addedAt: Date.now() }];
    saveList(updated); setInput(""); setLabelIn(""); setAddErr(""); setAdding(false);
    fetchActivity(addr);
  };

  return (
    <div>
      <div style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#52525b", marginBottom: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Watch a wallet
        </div>
        {adding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input value={input} onChange={e => { setInput(e.target.value); setAddErr(""); }} placeholder="Solana wallet address" style={INP} onKeyDown={e => e.key === "Enter" && addWallet()} autoFocus />
            <input value={labelIn} onChange={e => setLabelIn(e.target.value)} placeholder="Label (optional)" style={INP} />
            {addErr && <div style={{ fontSize: 11, color: "#ef4444" }}>{addErr}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={addWallet} style={{ ...BTN_BASE, background: "#ff2b4e", color: "#fff", border: "none" }}>Add</button>
              <button onClick={() => { setAdding(false); setAddErr(""); }} style={{ ...BTN_BASE, background: "transparent", color: "#71717a", border: "1px solid #27272a" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ ...BTN_BASE, background: "transparent", color: "#71717a", border: "1px solid #27272a", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>+</span> Add wallet
          </button>
        )}
      </div>

      {watchlist.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0 20px", color: "#3f3f46", fontSize: 11 }}>
          <IconEye size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.2 }} />
          No wallets watched yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {watchlist.map(w => {
          const act = activity[w.address];
          return (
            <div key={w.address} style={{ background: "#0d0d10", border: "1px solid #1e1e21" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #111114" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>{w.label}</span>
                  <span style={{ fontSize: 10, color: "#52525b" }}>{shortAddr(w.address)}</span>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => fetchActivity(w.address)} title="Refresh" style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", padding: "3px 5px" }}>
                    <IconRefresh size={11} />
                  </button>
                  <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer" style={{ color: "#52525b", display: "flex", alignItems: "center", padding: "3px 5px" }}>
                    <IconArrowUpRight size={11} />
                  </a>
                  <button onClick={() => {
                    const updated = watchlist.filter(x => x.address !== w.address);
                    saveList(updated);
                    setActivity(prev => { const n = { ...prev }; delete n[w.address]; return n; });
                  }} title="Remove" style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", padding: "3px 5px" }}>
                    <IconX size={11} />
                  </button>
                </div>
              </div>
              <div style={{ padding: "8px 14px" }}>
                {act?.loading && <div style={{ fontSize: 11, color: "#52525b", padding: "4px 0" }}>Loading…</div>}
                {!act?.loading && act?.error && <div style={{ fontSize: 11, color: "#ef4444", padding: "4px 0" }}>Error: {act.error}</div>}
                {!act?.loading && !act?.error && !act?.txs.length && <div style={{ fontSize: 11, color: "#3f3f46", padding: "4px 0" }}>No recent activity.</div>}
                {(act?.txs ?? []).map((tx, i) => {
                  const { action, label, color } = swapLabel(tx);
                  return (
                    <div key={tx.signature + i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < (act?.txs.length ?? 0) - 1 ? "1px solid #111114" : "none", fontSize: 11 }}>
                      <span style={{ padding: "1px 6px", fontSize: 9, fontWeight: 700, flexShrink: 0, background: `${color}18`, color, border: `1px solid ${color}44` }}>{action}</span>
                      <span style={{ color: "#a1a1aa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                      {tx.timestamp && <span style={{ color: "#3f3f46", flexShrink: 0 }}>{fmtAgo(tx.timestamp * 1000)}</span>}
                      <a href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noreferrer" style={{ color: "#3f3f46", flexShrink: 0, display: "flex" }}>
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

// ══════════════════════════════════════════════════════════════════════════════
// ALPHA NEWS PANEL
// ══════════════════════════════════════════════════════════════════════════════

interface NewsSignal { id: string; text: string; author: string; url: string; score: number; icon: string; pubDate: number; }

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          Alpha Signals · {signals.length}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {fetchedAt && <span style={{ fontSize: 10, color: "#3f3f46" }}>{Math.floor((Date.now() - fetchedAt) / 1000)}s ago</span>}
          <button onClick={fetchSignals} disabled={loading} style={{ ...BTN_BASE, background: "transparent", border: "1px solid #27272a", color: loading ? "#3f3f46" : "#71717a", padding: "4px 9px", display: "flex", alignItems: "center", gap: 4 }}>
            <IconRefresh size={10} /> Refresh
          </button>
        </div>
      </div>
      {loading && !signals.length && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 11 }}>Fetching alpha signals…</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {signals.map(sig => (
          <a key={sig.id} href={sig.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
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
                    <span style={{ fontSize: 10, color: "#3f3f46" }}>{sig.pubDate ? `${fmtAgo(sig.pubDate)} ago` : "—"}</span>
                    <div style={{ flex: 1, minWidth: 40, height: 2, background: "#18181c", overflow: "hidden" }}>
                      <div style={{ width: `${sig.score}%`, height: "100%", background: sig.score >= 60 ? "#ff2b4e" : sig.score >= 40 ? "#f97316" : "#52525b" }} />
                    </div>
                    <span style={{ fontSize: 9, color: sig.score >= 60 ? "#ff2b4e" : "#52525b", fontWeight: 700 }}>{sig.score}</span>
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

// ══════════════════════════════════════════════════════════════════════════════
// KOL ACTIVITY PANEL
// ══════════════════════════════════════════════════════════════════════════════

function KolActivityPanel() {
  const trades = useKolFeed();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div className="live-dot" style={{ background: "#22c55e" }} />
        <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>KOL Live Feed</span>
        <span style={{ fontSize: 10, color: "#3f3f46" }}>· {trades.length}</span>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 14, scrollbarWidth: "none" }}>
        {KOLS.map(k => (
          <a key={k.addr} href={`https://twitter.com/${k.tw}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{ background: "#0d0d10", border: `1px solid ${k.c}33`, padding: "8px 12px", minWidth: 80, transition: "border-color .15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${k.c}77`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = `${k.c}33`)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: k.c }}>{k.name}</span>
                <IconVerified size={9} />
              </div>
              <div style={{ fontSize: 9, color: "#52525b" }}>@{k.tw}</div>
            </div>
          </a>
        ))}
      </div>
      {trades.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#3f3f46", fontSize: 11 }}>
          <IconBell size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.2 }} />
          Waiting for live KOL trades…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {trades.map(t => (
            <div key={t.id} style={{ background: "#0d0d10", border: "1px solid #1e1e21", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${t.kolC}1a`, border: `1px solid ${t.kolC}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: t.kolC, flexShrink: 0 }}>
                {t.kol.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.kolC }}>{t.kol}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", background: t.type === "buy" ? "#22c55e18" : "#ef444418", color: t.type === "buy" ? "#22c55e" : "#ef4444", border: `1px solid ${t.type === "buy" ? "#22c55e44" : "#ef444444"}` }}>
                    {t.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: "#f4f4f5", fontWeight: 600 }}>${t.sym}</span>
                </div>
                <div style={{ fontSize: 10, color: "#52525b" }}>{t.sol} SOL · {t.tokAmt} tokens</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "#3f3f46" }}>
                  {t.ago < 60 ? `${t.ago}s` : t.ago < 3600 ? `${Math.floor(t.ago / 60)}m` : `${Math.floor(t.ago / 3600)}h`}
                </span>
                {t.mint && (
                  <a href={`https://dexscreener.com/solana/${t.mint}`} target="_blank" rel="noreferrer" style={{ color: "#3f3f46", display: "flex" }}>
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

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════

type MainTab = "xtracker" | "wallets" | "news" | "kol";

interface SocialTrackerTabProps {
  wallet:   string;
  isMobile: boolean;
}

export function SocialTrackerTab({ wallet: _wallet, isMobile }: SocialTrackerTabProps) {
  const [mainTab, setMainTab] = useState<MainTab>("xtracker");

  const tabs: { id: MainTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "xtracker", label: "X Tracker",  icon: <IconGlobe      size={11} />, badge: "NEW" },
    { id: "wallets",  label: "Wallets",     icon: <IconEye        size={11} /> },
    { id: "news",     label: "Alpha News",  icon: <IconNewspaper  size={11} /> },
    { id: "kol",      label: "KOL Scan",    icon: <IconRocket size={11} />, badge: "NEW" },
  ];

  return (
    <div style={{
      maxWidth: mainTab === "xtracker" && !isMobile ? 1100 : 760,
      margin: "0 auto",
      padding: isMobile ? "14px 12px 80px" : "20px 0 40px",
      ...MONO,
      transition: "max-width .2s",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 8, margin: 0, marginBottom: 4 }}>
          <IconGlobe size={isMobile ? 16 : 18} style={{ color: "#ff2b4e" }} />
          Tracker
        </h1>
        <p style={{ fontSize: 11, color: "#3f3f46", margin: 0 }}>
          X/Twitter feed · Wallet watcher · Alpha signals · KOL trades
        </p>
      </div>

      {/* Main tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e1e21", marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} style={{
            ...MONO, display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", fontSize: 11, fontWeight: mainTab === t.id ? 700 : 500,
            cursor: "pointer", color: mainTab === t.id ? "#ff2b4e" : "#52525b",
            background: mainTab === t.id ? "#ff2b4e14" : "transparent",
            border: `1px solid ${mainTab === t.id ? "#ff2b4e" : "#1e1e21"}`,
            borderBottom: mainTab === t.id ? "1px solid #ff2b4e" : "1px solid transparent",
            marginBottom: -1, transition: "color .15s, background .15s, border-color .15s",
          }}>
            {t.icon} {t.label}
            {t.badge && (
              <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 4px", background: "#ff2b4e", color: "#fff", marginLeft: 2 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {mainTab === "xtracker" && <XTrackerPanel isMobile={isMobile} />}
      {mainTab === "wallets"  && <WatchlistPanel isMobile={isMobile} />}
      {mainTab === "news"     && <AlphaNewsPanel />}
      {mainTab === "kol"      && <KolScanPanel />}
    </div>
  );
}
