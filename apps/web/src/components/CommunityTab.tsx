"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

const MONO    = "JetBrains Mono, monospace";
const RED     = "#ff2b4e";
const BG      = "#060607";
const SURFACE = "#0a0a0c";
const BORDER  = "#18181c";
const BORDER2 = "#28282e";
const MUTED   = "#52525b";
const TEXT    = "#e4e4e7";
const TEXT2   = "#a1a1aa";

const EMOJIS = ["🎰","⚡","👁️","🧪","🔥","💎","🚀","🌊","🐉","🎯","🦁","🐺","⚔️","🛡️","🌑","💡"];
const COLORS  = ["#ef4444","#f97316","#eab308","#10b981","#3b82f6","#a855f7","#ec4899","#14b8a6"];
const USER_EMOJIS = ["👤","🐉","🦁","🐺","🦊","🐸","🤖","👽","💀","🎭","🧙","⚔️","🛡️","🔥","💎","🌊"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  author: string;
  authorAlias: string;
  authorEmoji: string;
  text: string;
  type: "text" | "call" | "buy";
  tokenMint?: string;
  tokenSym?: string;
  createdAt: number;
  reactions: { fire: number; gem: number; rug: number };
  flagged?: boolean;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  type: "public" | "private";
  inviteCode?: string;
  owner: string;
  members?: string[];
  posts?: Post[];
  createdAt: number;
  emoji: string;
  color: string;
  tags: string[];
  price?: number;
  isMember?: boolean;
  isOwner?: boolean;
  memberCount?: number;
  postCount?: number;
  tokenMint?: string;
  tokenSymbol?: string;
  tokenLogo?: string;
  tokenPrice?: number;
  tokenMcap?: number;
  minTokensToPost?: number;
  sentiment?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000)     return "just now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(2)}`;
}

function sentimentColor(s: number): string {
  if (s >= 70) return "#10b981";
  if (s >= 40) return "#eab308";
  return "#ef4444";
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCss: React.CSSProperties = {
  background: "#0d0d10",
  border: `1px solid ${BORDER2}`,
  color: TEXT,
  fontSize: 11,
  fontFamily: MONO,
  outline: "none",
  padding: "8px 11px",
};

const btnCss = (active = false, color = RED): React.CSSProperties => ({
  background: active ? color + "20" : "transparent",
  border: `1px solid ${active ? color + "60" : BORDER2}`,
  color: active ? color : TEXT2,
  fontSize: 10,
  fontFamily: MONO,
  padding: "5px 12px",
  cursor: "pointer",
  fontWeight: active ? 700 : 500,
  transition: "all 0.15s",
});

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ ch, size }: { ch: Pick<Channel, "emoji" | "color">; size: number }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: ch.color + "18",
      border: `1.5px solid ${ch.color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.44),
    }}>
      {ch.emoji}
    </div>
  );
}

function SentimentBar({ value }: { value: number }) {
  const c = sentimentColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ flex: 1, height: 2, background: BORDER2, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${value}%`, background: c, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 8, color: c, fontWeight: 700, minWidth: 22, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function TokenBadge({ symbol, logo, price, mcap, mint }: { symbol?: string; logo?: string; price?: number; mcap?: number; mint?: string }) {
  if (!symbol && !mint) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#10b98110", border: "1px solid #10b98130", padding: "2px 7px" }}>
      {logo && <img src={logo} alt="" style={{ width: 12, height: 12, borderRadius: "50%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
      <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>${symbol ?? mint?.slice(0,6)}</span>
      {price !== undefined && <span style={{ fontSize: 8, color: TEXT2 }}>{price < 0.01 ? price.toExponential(2) : `$${price.toFixed(4)}`}</span>}
      {mcap !== undefined && <span style={{ fontSize: 8, color: MUTED }}>{fmtNum(mcap)}</span>}
    </div>
  );
}

function EmojiPicker({ value, onChange, emojis }: { value: string; onChange: (e: string) => void; emojis: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {emojis.map(e => (
        <button key={e} type="button" onClick={() => onChange(e)}
          style={{ fontSize: 15, padding: "3px 5px", border: `1px solid ${value === e ? "#a855f760" : BORDER}`, background: value === e ? "#a855f715" : "transparent", cursor: "pointer" }}>
          {e}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          style={{ width: 18, height: 18, background: c, border: value === c ? `2px solid #fff` : "2px solid transparent", cursor: "pointer", borderRadius: "50%" }} />
      ))}
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({
  post, isOwner, wallet, communityId, onDelete, onReact, onBuy,
}: {
  post: Post; isOwner: boolean; wallet: string; communityId: string;
  onDelete: (id: string) => void;
  onReact: (id: string, r: "fire" | "gem" | "rug") => void;
  onBuy?: (mint: string, sym: string) => void;
}) {
  const isAuthor = post.author === wallet;
  const canDelete = isAuthor || isOwner;

  return (
    <div style={{
      padding: "10px 14px",
      borderBottom: `1px solid ${BORDER}`,
      opacity: post.flagged ? 0.4 : 1,
      position: "relative",
    }}>
      {post.flagged && (
        <div style={{ fontSize: 8, color: "#ef4444", marginBottom: 4, fontWeight: 700 }}>⚠ FLAGGED FOR REVIEW</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <div style={{ fontSize: 16, lineHeight: 1 }}>{post.authorEmoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: TEXT, fontWeight: 700 }}>{post.authorAlias}</span>
            {post.type !== "text" && (
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "1px 5px",
                background: post.type === "call" ? "#eab30820" : "#10b98120",
                border: `1px solid ${post.type === "call" ? "#eab30840" : "#10b98140"}`,
                color: post.type === "call" ? "#eab308" : "#10b981",
              }}>
                {post.type === "call" ? "📢 CALL" : "💰 BUY"}
              </span>
            )}
            <span style={{ fontSize: 9, color: MUTED, marginLeft: "auto" }}>{ago(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ fontSize: 12, color: TEXT2, lineHeight: 1.5, marginBottom: 8, paddingLeft: 23 }}>
        {post.text}
      </div>

      {/* Token card for call/buy */}
      {(post.type === "call" || post.type === "buy") && post.tokenMint && (
        <div style={{ marginLeft: 23, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#10b98108", border: "1px solid #10b98130", padding: "4px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>${post.tokenSym ?? post.tokenMint.slice(0, 6)}</span>
            <span style={{ fontSize: 9, color: MUTED }}>{post.tokenMint.slice(0, 8)}…</span>
          </div>
          {post.type === "buy" && onBuy && post.tokenSym && (
            <button
              onClick={() => onBuy(post.tokenMint!, post.tokenSym!)}
              style={{ ...btnCss(false, "#10b981"), background: "#10b98120", border: "1px solid #10b98160", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "4px 12px" }}>
              BUY ${post.tokenSym}
            </button>
          )}
        </div>
      )}

      {/* Reactions + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 23 }}>
        {(["fire", "gem", "rug"] as const).map(r => (
          <button key={r} type="button"
            onClick={() => onReact(post.id, r)}
            style={{ display: "flex", alignItems: "center", gap: 3, background: "transparent", border: "none", cursor: "pointer", padding: "2px 5px", color: TEXT2, fontSize: 10, fontFamily: MONO }}>
            <span>{r === "fire" ? "🔥" : r === "gem" ? "💎" : "💩"}</span>
            <span style={{ color: post.reactions[r] > 0 ? TEXT : MUTED }}>{post.reactions[r]}</span>
          </button>
        ))}
        {canDelete && (
          <button type="button"
            onClick={() => onDelete(post.id)}
            style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 9, fontFamily: MONO, padding: "2px 5px", opacity: 0.6 }}>
            del
          </button>
        )}
      </div>
    </div>
  );
}

// ── Channel list item ─────────────────────────────────────────────────────────

function ChannelRow({ ch, active, onClick }: { ch: Channel; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: "100%", textAlign: "left", background: active ? ch.color + "12" : "transparent",
      border: "none", borderLeft: active ? `2px solid ${ch.color}` : "2px solid transparent",
      padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 9,
      transition: "all 0.12s",
    }}>
      <Avatar ch={ch} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: active ? TEXT : TEXT2, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ch.name}
          </span>
          {ch.tokenSymbol && (
            <span style={{ fontSize: 8, color: "#10b981", background: "#10b98112", padding: "1px 4px", flexShrink: 0 }}>${ch.tokenSymbol}</span>
          )}
          {ch.isMember && (
            <span style={{ fontSize: 7, color: ch.color, background: ch.color + "15", padding: "1px 4px", flexShrink: 0 }}>●</span>
          )}
        </div>
        <SentimentBar value={ch.sentiment ?? 50} />
        <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 8, color: MUTED }}>{ch.memberCount ?? 0} members</span>
          <span style={{ fontSize: 8, color: MUTED }}>·</span>
          <span style={{ fontSize: 8, color: MUTED }}>{ch.postCount ?? 0} posts</span>
        </div>
      </div>
    </button>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({ wallet, walletAlias, walletEmoji, onCreated }: {
  wallet: string; walletAlias: string; walletEmoji: string;
  onCreated: (ch: Channel) => void;
}) {
  const [name,          setName]          = useState("");
  const [desc,          setDesc]          = useState("");
  const [type,          setType]          = useState<"public" | "private">("public");
  const [emoji,         setEmoji]         = useState("🌐");
  const [color,         setColor]         = useState(COLORS[0]);
  const [tags,          setTags]          = useState("");
  const [tokenMint,     setTokenMint]     = useState("");
  const [mintPreview,   setMintPreview]   = useState<{ symbol?: string; logo?: string; price?: number } | null>(null);
  const [minTokens,     setMinTokens]     = useState("0");
  const [fetching,      setFetching]      = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");

  // Auto-fetch token metadata when mint looks valid
  const fetchMintMeta = useCallback(async (mint: string) => {
    if (mint.length < 32) { setMintPreview(null); return; }
    setFetching(true);
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      if (r.ok) {
        const d = await r.json();
        const pair = d?.pairs?.[0];
        if (pair) {
          setMintPreview({
            symbol: pair.baseToken?.symbol,
            logo:   pair.info?.imageUrl ?? undefined,
            price:  pair.priceUsd ? parseFloat(pair.priceUsd) : undefined,
          });
          return;
        }
      }
    } catch { /* ignore */ }
    setMintPreview(null);
    setFetching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchMintMeta(tokenMint), 600);
    return () => clearTimeout(t);
  }, [tokenMint, fetchMintMeta]);

  async function submit() {
    if (!name.trim() || name.length < 3) { setError("Name must be at least 3 characters"); return; }
    if (!wallet) { setError("Connect wallet first"); return; }
    setSubmitting(true); setError("");
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), description: desc.trim(), type, emoji, color,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          owner: wallet, ownerAlias: walletAlias, ownerEmoji: walletEmoji,
          tokenMint: tokenMint.trim() || undefined,
          minTokensToPost: parseFloat(minTokens) || 0,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Error"); return; }
      onCreated(d.community);
    } catch { setError("Network error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 11, color: TEXT, fontWeight: 700, letterSpacing: "1.5px" }}>NEW COMMUNITY</div>

      {/* Name */}
      <div>
        <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 4 }}>COMMUNITY NAME</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Degen Lounge"
          style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 4 }}>DESCRIPTION</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What's this community about?"
          style={{ ...inputCss, width: "100%", boxSizing: "border-box", resize: "none" }} />
      </div>

      {/* Emoji + Color */}
      <div>
        <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 6 }}>ICON</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar ch={{ emoji, color }} size={40} />
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} emojis={EMOJIS} />
      </div>

      <div>
        <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 6 }}>COLOR</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {/* Type */}
      <div>
        <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 6 }}>VISIBILITY</label>
        <div style={{ display: "flex", gap: 6 }}>
          {(["public", "private"] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              style={{ ...btnCss(type === t), flex: 1, padding: "6px" }}>
              {t === "public" ? "🌐 Public" : "🔒 Private"}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 4 }}>TAGS (comma-separated)</label>
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="meme, degen, alpha"
          style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
      </div>

      {/* Token gating */}
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
        <div style={{ fontSize: 9, color: "#10b981", fontWeight: 700, letterSpacing: "1px", marginBottom: 8 }}>TOKEN GATING (optional)</div>
        <div>
          <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 4 }}>TOKEN MINT ADDRESS</label>
          <input value={tokenMint} onChange={e => { setTokenMint(e.target.value); setMintPreview(null); }} placeholder="Paste Solana token mint…"
            style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
          {fetching && <div style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>Looking up token…</div>}
          {mintPreview && (
            <div style={{ marginTop: 6 }}>
              <TokenBadge symbol={mintPreview.symbol} logo={mintPreview.logo} price={mintPreview.price} />
            </div>
          )}
        </div>
        {tokenMint.length > 30 && (
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 4 }}>MIN TOKENS TO POST</label>
            <input type="number" min="0" value={minTokens} onChange={e => setMinTokens(e.target.value)}
              style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
            <div style={{ fontSize: 8, color: MUTED, marginTop: 3 }}>Set to 0 for all members; set &gt;0 to gate posting</div>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 10, color: "#ef4444" }}>{error}</div>}

      <button type="button" onClick={submit} disabled={submitting}
        style={{ ...btnCss(true), padding: "10px", fontWeight: 700, fontSize: 11, opacity: submitting ? 0.5 : 1 }}>
        {submitting ? "Creating…" : "CREATE COMMUNITY"}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  wallet: string;
  isMobile?: boolean;
  isCreator?: boolean;
  onBuy?: (mint: string, symbol: string) => void;
}

export function CommunityTab({ wallet, isMobile, isCreator = false, onBuy }: Props) {
  const [channels,      setChannels]      = useState<Channel[]>([]);
  const [active,        setActive]        = useState<string | null>(null);
  const [activeCh,      setActiveCh]      = useState<Channel | null>(null);
  const [posts,         setPosts]         = useState<Post[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [chLoading,     setChLoading]     = useState(false);
  const [posting,       setPosting]       = useState(false);
  const [postText,      setPostText]      = useState("");
  const [postType,      setPostType]      = useState<"text" | "call" | "buy">("text");
  const [postMint,      setPostMint]      = useState("");
  const [postSym,       setPostSym]       = useState("");
  const [walletEmoji,   setWalletEmoji]   = useState("👤");
  const [showCreate,    setShowCreate]    = useState(false);
  const [joinCode,      setJoinCode]      = useState("");
  const [joining,       setJoining]       = useState(false);
  const [postError,     setPostError]     = useState("");
  const [view,          setView]          = useState<"list" | "create" | "channel" | "admin">("list");
  const [leftOpen,      setLeftOpen]      = useState(!isMobile);
  const [adminStats,    setAdminStats]    = useState<{ totalCommunities: number; totalPosts: number; totalMembers: number; flaggedPosts: number; publicChannels: number } | null>(null);
  const [flaggedPosts,  setFlaggedPosts]  = useState<{ communityId: string; communityName: string; post: Post }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wallet alias
  const walletAlias = wallet ? wallet.slice(0, 6) + "…" + wallet.slice(-4) : "";

  // Load channel list
  const loadChannels = useCallback(async () => {
    try {
      const r = await fetch(`/api/community${wallet ? `?wallet=${wallet}` : ""}`);
      const d = await r.json();
      if (d.communities) setChannels(d.communities);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [wallet]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  // Load active channel
  const loadChannel = useCallback(async (id: string) => {
    setChLoading(true);
    try {
      const r = await fetch(`/api/community/${id}${wallet ? `?wallet=${wallet}` : ""}`);
      const d = await r.json();
      if (d.id) {
        setActiveCh(d);
        setPosts(d.posts ?? []);
      }
    } catch { /* ignore */ }
    finally { setChLoading(false); }
  }, [wallet]);

  // Poll for new posts
  useEffect(() => {
    if (!active) { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(() => loadChannel(active), 4_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, loadChannel]);

  // Scroll to bottom on new posts
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [posts.length]);

  function openChannel(id: string) {
    setActive(id);
    setView("channel");
    if (isMobile) setLeftOpen(false);
    loadChannel(id);
  }

  async function joinChannel(id: string) {
    if (!wallet) return;
    setJoining(true);
    try {
      const r = await fetch(`/api/community/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, inviteCode: joinCode }),
      });
      const d = await r.json();
      if (d.ok) {
        await loadChannels();
        await loadChannel(id);
      }
    } catch { /* ignore */ }
    finally { setJoining(false); }
  }

  async function sendPost() {
    if (!postText.trim() || !active || !wallet) return;
    setPosting(true); setPostError("");
    try {
      const body: Record<string, unknown> = {
        wallet, alias: walletAlias, authorEmoji: walletEmoji,
        text: postText.trim(), type: postType,
      };
      if (postType !== "text") { body.tokenMint = postMint; body.tokenSym = postSym; }

      const r = await fetch(`/api/community/${active}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setPostError(d.error ?? "Error"); return; }
      setPostText(""); setPostMint(""); setPostSym("");
      setPosts(prev => [d.post, ...prev]);
    } catch { setPostError("Network error"); }
    finally { setPosting(false); }
  }

  async function reactToPost(postId: string, reaction: "fire" | "gem" | "rug") {
    if (!active) return;
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, reactions: { ...p.reactions, [reaction]: p.reactions[reaction] + 1 } } : p
    ));
    await fetch(`/api/community/${active}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, reaction }),
    }).catch(() => {});
  }

  async function deletePost(postId: string, communityId?: string) {
    const cid = communityId ?? active;
    if (!cid || !wallet) return;
    await fetch(`/api/community/${cid}/post`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, wallet }),
    });
    if (cid === active) setPosts(prev => prev.filter(p => p.id !== postId));
    if (communityId) setFlaggedPosts(prev => prev.filter(fp => fp.post.id !== postId));
  }

  async function deleteCommunity(communityId: string) {
    if (!wallet || !isCreator) return;
    if (!confirm("Delete this entire community? This cannot be undone.")) return;
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, communityId }),
    });
    setChannels(prev => prev.filter(c => c.id !== communityId));
    if (active === communityId) { setActive(null); setActiveCh(null); setView("list"); }
  }

  async function loadAdmin() {
    if (!wallet || !isCreator) return;
    try {
      const r = await fetch(`/api/admin?wallet=${wallet}`);
      const d = await r.json();
      if (r.ok) { setAdminStats(d.stats); setFlaggedPosts(d.flagged ?? []); }
    } catch { /* ignore */ }
  }

  function onCreated(ch: Channel) {
    setChannels(prev => [{ ...ch, memberCount: 1, postCount: 1, isMember: true, isOwner: true }, ...prev]);
    setView("list");
    openChannel(ch.id);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100%", background: BG, position: "relative", overflow: "hidden" }}>

      {/* ── Left panel: channel list ── */}
      <div style={{
        width: isMobile ? (leftOpen ? "100%" : 0) : 260,
        flexShrink: 0,
        borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.2s",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: TEXT }}>COMMUNITIES</span>
            <span style={{ fontSize: 9, color: MUTED, marginLeft: "auto" }}>{channels.length}</span>
          </div>

          {/* Your emoji picker */}
          {wallet && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: MUTED, marginBottom: 5 }}>YOUR AVATAR</div>
              <EmojiPicker value={walletEmoji} onChange={setWalletEmoji} emojis={USER_EMOJIS} />
            </div>
          )}

          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={() => setView(view === "create" ? "list" : "create")}
              style={{ ...btnCss(view === "create"), flex: 1, padding: "7px", fontSize: 10 }}>
              {view === "create" ? "← BACK" : "+ NEW"}
            </button>
            {isCreator && (
              <button type="button" onClick={() => { setView(view === "admin" ? "list" : "admin"); if (view !== "admin") loadAdmin(); }}
                style={{ ...btnCss(view === "admin", "#ff2b4e"), padding: "7px 10px", fontSize: 9, fontWeight: 700 }}>
                ⚙ ADMIN
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 10, color: MUTED }}>Loading…</div>
          )}
          {!loading && channels.map(ch => (
            <div key={ch.id} style={{ position: "relative" }}>
              <ChannelRow ch={ch} active={active === ch.id} onClick={() => openChannel(ch.id)} />
              {isCreator && view !== "admin" && (
                <button type="button" onClick={e => { e.stopPropagation(); deleteCommunity(ch.id); }}
                  style={{ position: "absolute", top: 8, right: 8, background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 10, opacity: 0.4, fontFamily: MONO }}
                  title="Delete community">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Create form */}
        {view === "create" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <CreateForm wallet={wallet} walletAlias={walletAlias} walletEmoji={walletEmoji} onCreated={onCreated} />
          </div>
        )}

        {/* Empty state */}
        {view === "list" && !active && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 32 }}>💬</div>
            <div style={{ fontSize: 13, color: TEXT2, fontWeight: 700 }}>Select a community</div>
            <div style={{ fontSize: 10, color: MUTED }}>or create your own</div>
          </div>
        )}

        {/* Admin view */}
        {view === "admin" && isCreator && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            <div style={{ fontSize: 11, color: RED, fontWeight: 700, letterSpacing: "1.5px", marginBottom: 14 }}>⚙ CREATOR ADMIN</div>

            {/* Stats */}
            {adminStats && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { l: "Communities",  v: adminStats.totalCommunities },
                  { l: "Posts",        v: adminStats.totalPosts },
                  { l: "Members",      v: adminStats.totalMembers },
                  { l: "Flagged",      v: adminStats.flaggedPosts, warn: adminStats.flaggedPosts > 0 },
                ].map(s => (
                  <div key={s.l} style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: MUTED, marginBottom: 3 }}>{s.l}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.warn ? "#ef4444" : TEXT, fontFamily: MONO }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Flagged posts */}
            {flaggedPosts.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: "1px", marginBottom: 8 }}>
                  FLAGGED POSTS ({flaggedPosts.length})
                </div>
                {flaggedPosts.map(({ communityId, communityName, post }) => (
                  <div key={post.id} style={{ background: "#ef444408", border: "1px solid #ef444425", padding: "10px 12px", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700 }}>#{communityName}</span>
                      <span style={{ fontSize: 9, color: MUTED }}>{post.authorAlias}</span>
                      <button type="button" onClick={() => deletePost(post.id, communityId)}
                        style={{ marginLeft: "auto", background: "#ef444420", border: "1px solid #ef444450", color: "#ef4444", fontSize: 9, fontFamily: MONO, padding: "2px 8px", cursor: "pointer" }}>
                        DELETE
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: TEXT2 }}>{post.text}</div>
                  </div>
                ))}
              </div>
            )}
            {adminStats && flaggedPosts.length === 0 && (
              <div style={{ fontSize: 10, color: MUTED }}>No flagged posts ✓</div>
            )}
            {!adminStats && (
              <div style={{ fontSize: 10, color: MUTED }}>Loading admin data…</div>
            )}
          </div>
        )}

        {/* Channel view */}
        {view === "channel" && active && (
          <>
            {/* Channel header */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {isMobile && (
                <button type="button" onClick={() => { setLeftOpen(true); setView("list"); }}
                  style={{ background: "transparent", border: "none", color: TEXT2, cursor: "pointer", fontSize: 14, padding: 0 }}>
                  ←
                </button>
              )}
              {activeCh && <Avatar ch={activeCh} size={30} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: TEXT }}>{activeCh?.name}</span>
                  {activeCh?.type === "private" && <span style={{ fontSize: 9, color: MUTED }}>🔒</span>}
                  {activeCh?.tokenSymbol && (
                    <TokenBadge
                      symbol={activeCh.tokenSymbol} logo={activeCh.tokenLogo}
                      price={activeCh.tokenPrice} mcap={activeCh.tokenMcap}
                      mint={activeCh.tokenMint}
                    />
                  )}
                </div>
                <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{activeCh?.description}</div>
              </div>
              {activeCh && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                  <div style={{ display: "flex", gap: 6, fontSize: 9, color: MUTED }}>
                    <span>{activeCh.members?.length ?? activeCh.memberCount ?? 0} members</span>
                  </div>
                  {activeCh.sentiment !== undefined && (
                    <div style={{ fontSize: 8, color: sentimentColor(activeCh.sentiment), fontWeight: 700 }}>
                      SENTIMENT {activeCh.sentiment}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Join prompt for non-members */}
            {activeCh && !activeCh.isMember && (
              <div style={{ padding: "16px", borderBottom: `1px solid ${BORDER}`, background: "#10b98108" }}>
                <div style={{ fontSize: 10, color: TEXT2, marginBottom: 8 }}>
                  {activeCh.type === "private" ? "This community is private. Enter invite code to join." : "Join to start posting."}
                  {activeCh.minTokensToPost && activeCh.tokenSymbol
                    ? ` Requires ≥${activeCh.minTokensToPost} $${activeCh.tokenSymbol} to post.`
                    : ""}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {activeCh.type === "private" && (
                    <input value={joinCode} onChange={e => setJoinCode(e.target.value)}
                      placeholder="INVITE CODE" style={{ ...inputCss, flex: 1 }} />
                  )}
                  {wallet ? (
                    <button type="button" onClick={() => joinChannel(active)} disabled={joining}
                      style={{ ...btnCss(true, "#10b981"), padding: "6px 16px", fontWeight: 700 }}>
                      {joining ? "Joining…" : "JOIN"}
                    </button>
                  ) : (
                    <div style={{ fontSize: 10, color: MUTED }}>Connect wallet to join</div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column-reverse" }}>
              {chLoading && posts.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", fontSize: 10, color: MUTED }}>Loading…</div>
              )}
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwner={(activeCh?.isOwner ?? false) || isCreator}
                  wallet={wallet}
                  communityId={active}
                  onDelete={deletePost}
                  onReact={reactToPost}
                  onBuy={onBuy}
                />
              ))}
              {!chLoading && posts.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", fontSize: 10, color: MUTED }}>No messages yet. Be the first!</div>
              )}
            </div>

            {/* Composer */}
            {activeCh?.isMember && wallet && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: "10px 14px", flexShrink: 0 }}>
                {/* Post type selector */}
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {(["text", "call", "buy"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setPostType(t)}
                      style={{ ...btnCss(postType === t), fontSize: 9, padding: "3px 8px" }}>
                      {t === "text" ? "💬 text" : t === "call" ? "📢 call" : "💰 buy"}
                    </button>
                  ))}
                </div>

                {/* Token fields for call/buy */}
                {postType !== "text" && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input value={postMint} onChange={e => setPostMint(e.target.value)}
                      placeholder="Token mint address" style={{ ...inputCss, flex: 3 }} />
                    <input value={postSym} onChange={e => setPostSym(e.target.value)}
                      placeholder="SYM" style={{ ...inputCss, flex: 1 }} />
                  </div>
                )}

                {/* Text input */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ fontSize: 16 }}>{walletEmoji}</div>
                  <textarea
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPost(); } }}
                    placeholder="Message… (Enter to send, Shift+Enter for newline)"
                    rows={2}
                    style={{ ...inputCss, flex: 1, resize: "none" }}
                  />
                  <button type="button" onClick={sendPost} disabled={posting || !postText.trim()}
                    style={{ ...btnCss(true), padding: "8px 14px", fontWeight: 700, opacity: (posting || !postText.trim()) ? 0.4 : 1 }}>
                    {posting ? "…" : "→"}
                  </button>
                </div>
                {postError && <div style={{ fontSize: 9, color: "#ef4444", marginTop: 5 }}>{postError}</div>}
              </div>
            )}

            {!wallet && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 16px", textAlign: "center", fontSize: 10, color: MUTED }}>
                Connect wallet to participate
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
