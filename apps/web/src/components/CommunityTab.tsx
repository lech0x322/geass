"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

const MONO    = "JetBrains Mono, monospace";
const RED     = "#ff2b4e";
const BG      = "#060607";
const SURFACE = "#0a0a0c";
const BORDER  = "#18181c";
const BORDER2 = "#28282e";

const EMOJIS = ["🎰","⚡","👁️","🧪","🔥","💎","🚀","🌊","🐉","🎯","🦁","🐺","⚔️","🛡️","🌑","💡"];
// Must match allowed colors in /api/community POST route
const COLORS  = ["#ef4444","#f97316","#eab308","#10b981","#3b82f6","#a855f7","#ec4899","#14b8a6"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  author: string;
  authorAlias: string;
  text: string;
  tokenMint?: string;
  createdAt: number;
  reactions: { fire: number; gem: number; rug: number };
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000)     return "just now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCss: React.CSSProperties = {
  background: SURFACE,
  border: `1px solid ${BORDER2}`,
  color: "#e4e4e7",
  fontSize: 11,
  fontFamily: MONO,
  outline: "none",
  padding: "8px 11px",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ ch, size }: { ch: Pick<Channel, "emoji" | "color">; size: number }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: ch.color + "18",
      border: `1.5px solid ${ch.color}45`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.44),
      boxShadow: `0 0 ${Math.round(size / 3)}px ${ch.color}1a`,
    }}>
      {ch.emoji}
    </div>
  );
}

function TagPill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 8, color, background: color + "12", border: `1px solid ${color}28`, padding: "1px 6px", fontFamily: MONO }}>
      #{text}
    </span>
  );
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {EMOJIS.map(e => (
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
          style={{ width: 22, height: 22, background: c, border: value === c ? "2.5px solid #fff" : "2px solid transparent", cursor: "pointer", flexShrink: 0, boxShadow: value === c ? `0 0 6px ${c}80` : "none" }} />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function CommunityTab({ wallet, isMobile }: { wallet: string; isMobile: boolean }) {
  // List state
  const [channels, setChannels]     = useState<Channel[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterMine, setFilterMine] = useState(false);
  const [sortKey, setSortKey]       = useState<"popular" | "newest" | "active">("popular");

  // View state
  const [view, setView]             = useState<"list" | "channel" | "create">("list");
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [detail, setDetail]         = useState<Channel | null>(null);
  const [detailTab, setDetailTab]   = useState<"posts" | "about">("posts");
  const [detailLoading, setDetailLoading] = useState(false);

  // Post state
  const [postText, setPostText]     = useState("");
  const [tokenMint, setTokenMint]   = useState("");
  const [posting, setPosting]       = useState(false);
  const [editPost, setEditPost]     = useState<Post | null>(null);
  const [editText, setEditText]     = useState("");

  // Join state
  const [joinCode, setJoinCode]     = useState("");
  const [joinErr, setJoinErr]       = useState("");

  // Edit channel state
  const [editingCh, setEditingCh]   = useState(false);
  const [editForm, setEditForm]     = useState({
    name: "", description: "", emoji: "🎯", color: "#a855f7", tags: "",
    type: "public" as "public" | "private",
  });

  // Create state
  const [form, setForm] = useState({
    name: "", description: "", type: "public" as "public" | "private",
    emoji: "🎯", color: "#a855f7", tags: "",
  });
  const [creating, setCreating]     = useState(false);
  const [createErr, setCreateErr]   = useState("");

  const postsRef = useRef<HTMLDivElement>(null);

  // Load channels
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/community${wallet ? `?wallet=${wallet}` : ""}`);
      if (r.ok) {
        const data = await r.json() as { communities: Channel[] };
        setChannels((data.communities ?? []).map(c => ({ ...c, isOwner: c.owner === wallet })));
      }
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { void loadList(); }, [loadList]);

  // Open channel
  const openChannel = useCallback(async (id: string) => {
    setActiveId(id);
    setView("channel");
    setDetailTab("posts");
    setDetail(null);
    setDetailLoading(true);
    setJoinErr("");
    setEditingCh(false);
    try {
      const r = await fetch(`/api/community/${id}${wallet ? `?wallet=${wallet}` : ""}`);
      if (r.ok) setDetail(await r.json() as Channel);
    } finally {
      setDetailLoading(false);
    }
  }, [wallet]);

  // Post actions
  const submitPost = async () => {
    if (!detail || !postText.trim() || posting) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/community/${detail.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, alias: wallet.slice(0, 8), text: postText.trim(), tokenMint: tokenMint.trim() || undefined }),
      });
      if (r.ok) {
        const data = await r.json() as { post: Post };
        setDetail(prev => prev ? { ...prev, posts: [data.post, ...(prev.posts ?? [])] } : prev);
        setPostText("");
        setTokenMint("");
      }
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!detail) return;
    const r = await fetch(`/api/community/${detail.id}/post`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, wallet }),
    });
    if (r.ok) setDetail(prev => prev ? { ...prev, posts: (prev.posts ?? []).filter(p => p.id !== postId) } : prev);
  };

  const saveEditPost = async () => {
    if (!detail || !editPost) return;
    const r = await fetch(`/api/community/${detail.id}/post`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: editPost.id, wallet, text: editText }),
    });
    if (r.ok) {
      setDetail(prev => prev ? { ...prev, posts: (prev.posts ?? []).map(p => p.id === editPost.id ? { ...p, text: editText } : p) } : prev);
      setEditPost(null);
    }
  };

  const react = async (postId: string, reaction: "fire" | "gem" | "rug") => {
    if (!detail) return;
    const r = await fetch(`/api/community/${detail.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, reaction }),
    });
    if (r.ok) {
      setDetail(prev => prev ? {
        ...prev,
        posts: (prev.posts ?? []).map(p => p.id === postId
          ? { ...p, reactions: { ...p.reactions, [reaction]: p.reactions[reaction] + 1 } }
          : p),
      } : prev);
    }
  };

  // Join / Leave
  const joinChannel = async () => {
    if (!detail) return;
    setJoinErr("");
    const r = await fetch(`/api/community/${detail.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, inviteCode: joinCode || undefined }),
    });
    if (r.ok) {
      setJoinCode("");
      await openChannel(detail.id);
      void loadList();
    } else {
      const d = await r.json() as { error?: string };
      setJoinErr(d.error ?? "Failed to join");
    }
  };

  const leaveChannel = async () => {
    if (!detail) return;
    const r = await fetch(`/api/community/${detail.id}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    if (r.ok) {
      await openChannel(detail.id);
      void loadList();
    }
  };

  // Edit channel
  const openEditChannel = () => {
    if (!detail) return;
    setEditForm({
      name: detail.name,
      description: detail.description,
      emoji: detail.emoji,
      color: COLORS.includes(detail.color) ? detail.color : "#a855f7",
      tags: detail.tags.join(", "),
      type: detail.type,
    });
    setEditingCh(true);
  };

  const saveChannel = async () => {
    if (!detail) return;
    const r = await fetch(`/api/community/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        name:        editForm.name,
        description: editForm.description,
        emoji:       editForm.emoji,
        color:       editForm.color,
        tags:        editForm.tags.split(",").map(t => t.trim()).filter(Boolean),
        type:        editForm.type,
      }),
    });
    if (r.ok) {
      setEditingCh(false);
      await openChannel(detail.id);
      void loadList();
    }
  };

  // Create channel
  const createChannel = async () => {
    if (!form.name.trim() || !wallet || creating) return;
    setCreating(true);
    setCreateErr("");
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet, ownerAlias: wallet.slice(0, 8),
          name: form.name, description: form.description,
          type: form.type, emoji: form.emoji, color: form.color,
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      if (r.ok) {
        const data = await r.json() as { community: { id: string } };
        await loadList();
        await openChannel(data.community.id);
      } else {
        const d = await r.json() as { error?: string };
        setCreateErr(d.error ?? "Failed to create");
      }
    } finally {
      setCreating(false);
    }
  };

  // Filtered + sorted list
  const filtered = channels
    .filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
          !c.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterMine && !c.isMember && !c.isOwner) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "popular") return (b.memberCount ?? 0) - (a.memberCount ?? 0);
      if (sortKey === "newest")  return b.createdAt - a.createdAt;
      if (sortKey === "active")  return (b.postCount ?? 0) - (a.postCount ?? 0);
      return 0;
    });

  const isMember = detail?.isMember ?? false;
  const isOwner  = detail?.isOwner  ?? false;

  // ══════════════════════════════════════════════════════════════════════════════
  // CREATE VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "create") {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 14px 80px" : "20px 28px" }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <button onClick={() => setView("list")}
              style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#71717a", padding: "5px 12px", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>
              ← BACK
            </button>
            <span style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "2px", fontWeight: 700 }}>[ CREATE CHANNEL ]</span>
          </div>

          {/* Live preview */}
          <div style={{
            background: SURFACE,
            border: `1px solid ${form.color}40`,
            padding: "16px 18px",
            marginBottom: 24,
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: `0 0 30px ${form.color}0a`,
          }}>
            <Avatar ch={form} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#f4f4f5", fontFamily: MONO, marginBottom: 4 }}>
                {form.name || "Channel Name"}
              </div>
              <div style={{ fontSize: 10, color: "#71717a", fontFamily: MONO, lineHeight: 1.5, marginBottom: 6 }}>
                {form.description || "Channel description…"}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {form.tags.split(",").map(t => t.trim()).filter(Boolean).slice(0, 5).map(t => (
                  <TagPill key={t} text={t} color={form.color} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", marginBottom: 6 }}>CHANNEL NAME *</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={40} placeholder="e.g. Alpha Hunters"
                style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", marginBottom: 6 }}>DESCRIPTION</div>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} maxLength={200} rows={3}
                style={{ ...inputCss, width: "100%", resize: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", marginBottom: 8 }}>EMOJI</div>
                <EmojiPicker value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e }))} />
              </div>
              <div>
                <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", marginBottom: 8 }}>COLOR</div>
                <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", marginBottom: 6 }}>TAGS (comma separated)</div>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="alpha, degen, solana"
                style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", marginBottom: 8 }}>VISIBILITY</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["public", "private"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{ flex: 1, padding: "10px", border: `1px solid ${form.type === t ? form.color + "60" : BORDER}`, background: form.type === t ? form.color + "14" : "transparent", color: form.type === t ? form.color : "#71717a", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: MONO }}>
                    {t === "public" ? "🌐 PUBLIC" : "🔒 PRIVATE"}
                  </button>
                ))}
              </div>
            </div>
            {createErr && <div style={{ fontSize: 10, color: "#ef4444", fontFamily: MONO }}>{createErr}</div>}
            <button onClick={createChannel} disabled={creating || !form.name.trim() || !wallet}
              style={{ padding: "13px", border: "none", background: creating || !form.name.trim() ? "#18181c" : RED, color: creating || !form.name.trim() ? "#3f3f46" : "#fff", fontSize: 11, fontWeight: 800, cursor: creating || !form.name.trim() ? "default" : "pointer", fontFamily: MONO, letterSpacing: "1.5px" }}>
              {creating ? "CREATING…" : "CREATE CHANNEL"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LIST PANEL
  // ══════════════════════════════════════════════════════════════════════════════
  const listPanel = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "2px", fontWeight: 700, flex: 1 }}>[ ■ CHANNELS ]</span>
        <button
          onClick={() => { setView("create"); setCreateErr(""); setForm({ name: "", description: "", type: "public", emoji: "🎯", color: "#a855f7", tags: "" }); }}
          style={{ fontSize: 9, padding: "5px 11px", border: `1px solid ${RED}40`, background: RED + "0c", color: RED, cursor: "pointer", fontFamily: MONO, fontWeight: 700 }}>
          + NEW
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", background: BORDER, gap: "1px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {[
          { l: "TOTAL",  v: channels.length,                         c: "#3b82f6" },
          { l: "JOINED", v: channels.filter(c => c.isMember).length, c: "#10b981" },
          { l: "OWNED",  v: channels.filter(c => c.isOwner).length,  c: RED },
        ].map(s => (
          <div key={s.l} style={{ background: BG, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.c, fontFamily: MONO }}>{s.v}</div>
            <div style={{ fontSize: 7, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: SURFACE, border: `1px solid ${BORDER2}`, padding: "6px 10px", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#3f3f46", lineHeight: 1 }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search channels…"
            style={{ background: "transparent", border: "none", color: "#e4e4e7", fontSize: 11, fontFamily: MONO, outline: "none", flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setFilterMine(v => !v)}
            style={{ fontSize: 8, padding: "3px 9px", border: `1px solid ${filterMine ? RED + "40" : BORDER}`, background: filterMine ? RED + "0c" : "transparent", color: filterMine ? RED : "#52525b", cursor: "pointer", fontFamily: MONO, fontWeight: 700 }}>
            {filterMine ? "✓ MINE" : "MINE"}
          </button>
          {(["popular", "newest", "active"] as const).map(k => (
            <button key={k} onClick={() => setSortKey(k)}
              style={{ flex: 1, fontSize: 7, padding: "3px 5px", border: `1px solid ${sortKey === k ? "#3b82f640" : BORDER}`, background: sortKey === k ? "#3b82f610" : "transparent", color: sortKey === k ? "#3b82f6" : "#52525b", cursor: "pointer", fontFamily: MONO }}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: "30px", textAlign: "center", fontSize: 11, color: "#3f3f46", fontFamily: MONO }} className="pulse">LOADING…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>📡</div>
            <div style={{ fontSize: 11, color: "#3f3f46", fontFamily: MONO }}>
              {search || filterMine ? "No channels found" : "No channels yet"}
            </div>
          </div>
        )}
        {filtered.map(ch => {
          const active = activeId === ch.id;
          return (
            <div key={ch.id} onClick={() => openChannel(ch.id)}
              style={{ cursor: "pointer", padding: "11px 13px", background: active ? "#0e0e12" : "transparent", borderLeft: `3px solid ${active ? ch.color : "transparent"}`, borderBottom: `1px solid ${BORDER}80`, display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar ch={ch} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: active ? "#f4f4f5" : "#a1a1aa", fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ch.name}
                  </span>
                  {ch.isMember && <span style={{ fontSize: 6, fontWeight: 700, color: "#10b981", background: "#10b98110", border: "1px solid #10b98120", padding: "1px 4px", fontFamily: MONO, flexShrink: 0 }}>✓</span>}
                  {ch.type === "private" && <span style={{ fontSize: 9, color: "#71717a", flexShrink: 0 }}>🔒</span>}
                </div>
                <div style={{ fontSize: 9, color: "#52525b", fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ch.description}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? ch.color : "#71717a", fontFamily: MONO }}>{ch.memberCount ?? 0}</div>
                <div style={{ fontSize: 7, color: "#3f3f46", fontFamily: MONO }}>mbrs</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // CHANNEL PANEL
  // ══════════════════════════════════════════════════════════════════════════════
  const channelPanel = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, background: BG, display: "flex", alignItems: "center", gap: 8, flexShrink: 0, minHeight: 40 }}>
        {isMobile && (
          <button onClick={() => { setView("list"); setDetail(null); setActiveId(null); }}
            style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#71717a", padding: "4px 10px", fontSize: 9, cursor: "pointer", fontFamily: MONO, flexShrink: 0 }}>
            ←
          </button>
        )}
        {detail ? (
          <>
            <Avatar ch={detail} size={22} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7", fontFamily: MONO, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {detail.name}
            </span>
            {isOwner && (
              <button onClick={openEditChannel}
                style={{ fontSize: 8, padding: "4px 10px", border: `1px solid ${BORDER}`, background: "transparent", color: "#71717a", cursor: "pointer", fontFamily: MONO, flexShrink: 0 }}>
                ✏ EDIT
              </button>
            )}
            {isMember && !isOwner && (
              <button onClick={leaveChannel}
                style={{ fontSize: 8, padding: "4px 10px", border: "1px solid #ef444428", background: "#ef444408", color: "#ef4444", cursor: "pointer", fontFamily: MONO, flexShrink: 0 }}>
                LEAVE
              </button>
            )}
            {isOwner && detail.inviteCode && (
              <button onClick={() => navigator.clipboard.writeText(detail.inviteCode!).catch(() => {})}
                style={{ fontSize: 8, padding: "4px 10px", border: "1px solid #f9731628", background: "#f9731610", color: "#f97316", cursor: "pointer", fontFamily: MONO, flexShrink: 0 }}>
                📋 {detail.inviteCode}
              </button>
            )}
          </>
        ) : (!detailLoading && !isMobile && (
          <span style={{ fontSize: 10, color: "#3f3f46", fontFamily: MONO }}>← Select a channel to begin</span>
        ))}
      </div>

      {detailLoading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: "#3f3f46", fontFamily: MONO }} className="pulse">LOADING CHANNEL…</span>
        </div>
      )}

      {!detailLoading && !detail && !isMobile && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ fontSize: 42 }}>📡</div>
          <div style={{ fontSize: 13, color: "#3f3f46", fontFamily: MONO }}>Select a channel to view</div>
          <button
            onClick={() => { setView("create"); setCreateErr(""); setForm({ name: "", description: "", type: "public", emoji: "🎯", color: "#a855f7", tags: "" }); }}
            style={{ marginTop: 4, padding: "9px 20px", border: `1px solid ${RED}30`, background: RED + "0c", color: RED, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: MONO, letterSpacing: "1px" }}>
            + CREATE CHANNEL
          </button>
        </div>
      )}

      {detail && !detailLoading && (
        <>
          {/* Channel header with gradient */}
          <div style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${BORDER}`,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${detail.color}0e 0%, #000 80%)`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Avatar ch={detail} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#f4f4f5", fontFamily: MONO }}>{detail.name}</span>
                  {detail.type === "private" && (
                    <span style={{ fontSize: 8, color: "#71717a", background: "#1a1a1e", border: `1px solid ${BORDER}`, padding: "1px 5px", fontFamily: MONO }}>🔒 PRIVATE</span>
                  )}
                  {isMember && !isOwner && (
                    <span style={{ fontSize: 8, color: "#10b981", background: "#10b98110", border: "1px solid #10b98128", padding: "1px 5px", fontFamily: MONO }}>✓ MEMBER</span>
                  )}
                  {isOwner && (
                    <span style={{ fontSize: 8, color: RED, background: RED + "10", border: `1px solid ${RED}28`, padding: "1px 5px", fontFamily: MONO }}>OWNER</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#71717a", fontFamily: MONO, marginBottom: 6, lineHeight: 1.5 }}>{detail.description}</div>
                <div style={{ display: "flex", gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, fontFamily: MONO }}>
                    <span style={{ color: detail.color, fontWeight: 700 }}>{detail.members?.length ?? 0}</span>
                    <span style={{ color: "#52525b" }}> members</span>
                  </span>
                  <span style={{ fontSize: 9, fontFamily: MONO }}>
                    <span style={{ color: "#a1a1aa", fontWeight: 700 }}>{detail.posts?.length ?? 0}</span>
                    <span style={{ color: "#52525b" }}> posts</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {detail.tags.map(t => <TagPill key={t} text={t} color={detail.color} />)}
                </div>
              </div>
            </div>

            {!isMember && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {detail.type === "private" && (
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter invite code"
                    style={{ ...inputCss, flex: 1, minWidth: 120, padding: "6px 10px" }} />
                )}
                <button onClick={joinChannel}
                  style={{ padding: "9px 22px", border: "none", background: detail.color, color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: MONO }}>
                  JOIN CHANNEL
                </button>
                {joinErr && <span style={{ fontSize: 9, color: "#ef4444", fontFamily: MONO }}>{joinErr}</span>}
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, background: BG, flexShrink: 0 }}>
            {(["posts", "about"] as const).map(tab => (
              <button key={tab} onClick={() => { setDetailTab(tab); setEditingCh(false); }}
                style={{ padding: "9px 20px", border: "none", borderBottom: detailTab === tab ? `2px solid ${detail.color}` : "2px solid transparent", background: "transparent", color: detailTab === tab ? detail.color : "#52525b", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: MONO, letterSpacing: "1.5px" }}>
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* ── POSTS TAB ──────────────────────────────────────────────── */}
          {detailTab === "posts" && (
            <>
              <div ref={postsRef} style={{ flex: 1, overflowY: "auto", padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {(detail.posts ?? []).length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>💬</div>
                    <div style={{ fontSize: 11, fontFamily: MONO }}>
                      {isMember ? "No posts yet — be the first!" : "Join to see and post in this channel."}
                    </div>
                  </div>
                )}
                {(detail.posts ?? []).map(post => {
                  const mine = post.author === wallet;
                  const isEditing = editPost?.id === post.id;
                  return (
                    <div key={post.id} style={{
                      background: "#080809",
                      border: `1px solid ${mine ? detail.color + "22" : BORDER}`,
                      padding: "10px 12px",
                      borderLeft: `3px solid ${mine ? detail.color + "70" : "transparent"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                        <div style={{
                          width: 26, height: 26, flexShrink: 0,
                          background: mine ? detail.color + "18" : "#111113",
                          border: `1px solid ${mine ? detail.color + "40" : BORDER2}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, color: mine ? detail.color : "#52525b", fontFamily: MONO,
                        }}>
                          {post.authorAlias[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: mine ? detail.color : "#a1a1aa", fontFamily: MONO }}>{post.authorAlias}</span>
                          {mine && <span style={{ fontSize: 7, color: "#3f3f46", background: "#111113", padding: "1px 4px", marginLeft: 5, fontFamily: MONO }}>YOU</span>}
                          <span style={{ fontSize: 8, color: "#3f3f46", fontFamily: MONO, marginLeft: 8 }}>{ago(post.createdAt)}</span>
                        </div>
                        {mine && !isEditing && (
                          <div style={{ display: "flex", gap: 3 }}>
                            <button onClick={() => { setEditPost(post); setEditText(post.text); }}
                              style={{ fontSize: 8, padding: "2px 7px", border: `1px solid ${BORDER}`, background: "transparent", color: "#52525b", cursor: "pointer", fontFamily: MONO }}>✏</button>
                            <button onClick={() => deletePost(post.id)}
                              style={{ fontSize: 8, padding: "2px 7px", border: "1px solid #ef444428", background: "#ef444408", color: "#ef4444", cursor: "pointer", fontFamily: MONO }}>×</button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} maxLength={500}
                            style={{ ...inputCss, width: "100%", resize: "none", boxSizing: "border-box", border: `1px solid ${RED}40` }} />
                          <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                            <button onClick={saveEditPost}
                              style={{ padding: "4px 14px", border: "none", background: RED, color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: MONO }}>SAVE</button>
                            <button onClick={() => setEditPost(null)}
                              style={{ padding: "4px 14px", border: `1px solid ${BORDER}`, background: "transparent", color: "#71717a", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.65, marginBottom: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {post.text}
                          </div>
                          {post.tokenMint && (
                            <a href={`https://pump.fun/${post.tokenMint}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 8, color: "#a855f7", background: "#a855f710", border: "1px solid #a855f726", padding: "2px 8px", textDecoration: "none", marginBottom: 8, fontFamily: MONO }}>
                              ↗ TOKEN: {post.tokenMint.slice(0, 12)}…
                            </a>
                          )}
                          <div style={{ display: "flex", gap: 4 }}>
                            {(["fire", "gem", "rug"] as const).map(r => (
                              <button key={r} onClick={() => react(post.id, r)}
                                style={{ padding: "2px 9px", border: "1px solid #1e1e22", background: "#060607", cursor: "pointer", fontSize: 10, fontFamily: MONO, display: "flex", alignItems: "center", gap: 4, color: "#71717a" }}>
                                {r === "fire" ? "🔥" : r === "gem" ? "💎" : "🚩"}
                                {post.reactions[r] > 0 && <span style={{ fontSize: 9, color: "#a1a1aa" }}>{post.reactions[r]}</span>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {isMember && (
                <div style={{ padding: isMobile ? "8px 12px 72px" : "10px 16px", borderTop: `1px solid ${BORDER}`, background: BG, flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                    <textarea
                      value={postText}
                      onChange={e => setPostText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitPost(); } }}
                      placeholder="Share alpha, a call, or a thought… (Enter to post)"
                      rows={2} maxLength={500}
                      style={{ ...inputCss, flex: 1, resize: "none", border: `1px solid ${postText.trim() ? detail.color + "45" : BORDER2}` }}
                    />
                    <button onClick={submitPost} disabled={posting || !postText.trim()}
                      style={{ padding: "0 16px", height: 55, border: "none", background: posting || !postText.trim() ? "#18181c" : RED, color: posting || !postText.trim() ? "#3f3f46" : "#fff", fontSize: 10, fontWeight: 800, cursor: posting || !postText.trim() ? "default" : "pointer", flexShrink: 0, fontFamily: MONO, letterSpacing: "1px" }}>
                      {posting ? "…" : "POST"}
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                    <span style={{ fontSize: 8, color: "#3f3f46", fontFamily: MONO, flexShrink: 0 }}>TOKEN MINT:</span>
                    <input value={tokenMint} onChange={e => setTokenMint(e.target.value)} placeholder="optional — links to pump.fun"
                      style={{ ...inputCss, flex: 1, padding: "4px 8px", fontSize: 9 }} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ABOUT TAB ──────────────────────────────────────────────── */}
          {detailTab === "about" && (
            <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px" : "16px 20px" }}>
              {isOwner && !editingCh && (
                <button onClick={openEditChannel}
                  style={{ width: "100%", padding: "10px", border: `1px solid ${RED}30`, background: RED + "08", color: RED, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: MONO, marginBottom: 16 }}>
                  ✏ EDIT CHANNEL SETTINGS
                </button>
              )}

              {isOwner && editingCh && (
                <div style={{ background: SURFACE, border: `1px solid ${RED}30`, padding: "16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 8, color: RED, fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 14 }}>[ EDIT CHANNEL ]</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, marginBottom: 5 }}>NAME</div>
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} maxLength={40}
                        style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, marginBottom: 5 }}>DESCRIPTION</div>
                      <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={200}
                        style={{ ...inputCss, width: "100%", resize: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, marginBottom: 6 }}>EMOJI</div>
                        <EmojiPicker value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e }))} />
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, marginBottom: 6 }}>COLOR</div>
                        <ColorPicker value={editForm.color} onChange={c => setEditForm(f => ({ ...f, color: c }))} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, marginBottom: 5 }}>TAGS</div>
                      <input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                        style={{ ...inputCss, width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["public", "private"] as const).map(t => (
                        <button key={t} type="button" onClick={() => setEditForm(f => ({ ...f, type: t }))}
                          style={{ flex: 1, padding: "8px", border: `1px solid ${editForm.type === t ? editForm.color + "55" : BORDER}`, background: editForm.type === t ? editForm.color + "12" : "transparent", color: editForm.type === t ? editForm.color : "#71717a", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: MONO }}>
                          {t === "public" ? "🌐 PUBLIC" : "🔒 PRIVATE"}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveChannel}
                        style={{ flex: 1, padding: "10px", border: "none", background: RED, color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: MONO }}>
                        SAVE CHANGES
                      </button>
                      <button onClick={() => setEditingCh(false)}
                        style={{ padding: "10px 16px", border: `1px solid ${BORDER}`, background: "transparent", color: "#71717a", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>
                        CANCEL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 12 }}>CHANNEL INFO</div>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 20px", alignItems: "start" }}>
                  {[
                    ["OWNER",   `${detail.owner.slice(0, 8)}…`],
                    ["TYPE",    detail.type.toUpperCase()],
                    ["MEMBERS", String(detail.members?.length ?? 0)],
                    ["POSTS",   String(detail.posts?.length ?? 0)],
                    ["CREATED", new Date(detail.createdAt).toLocaleDateString()],
                  ].map(([k, v]) => (
                    <React.Fragment key={k}>
                      <span style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", whiteSpace: "nowrap" }}>{k}</span>
                      <span style={{ fontSize: 10, color: "#a1a1aa", fontFamily: MONO }}>{v}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {isOwner && detail.inviteCode && (
                <div style={{ background: "#f9731608", border: "1px solid #f9731628", padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 8, color: "#f97316", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 8 }}>INVITE CODE — share with members</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#f97316", fontFamily: MONO, letterSpacing: "4px" }}>{detail.inviteCode}</span>
                    <button onClick={() => navigator.clipboard.writeText(detail.inviteCode!).catch(() => {})}
                      style={{ fontSize: 8, padding: "4px 10px", border: "1px solid #f9731630", background: "#f9731612", color: "#f97316", cursor: "pointer", fontFamily: MONO }}>
                      COPY
                    </button>
                  </div>
                </div>
              )}

              {detail.tags.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {detail.tags.map(t => <TagPill key={t} text={t} color={detail.color} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // LAYOUT
  // ══════════════════════════════════════════════════════════════════════════════

  if (isMobile) {
    if (view === "channel") {
      return <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>{channelPanel}</div>;
    }
    return <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>{listPanel}</div>;
  }

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 300, minWidth: 260, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {listPanel}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {channelPanel}
      </div>
    </div>
  );
}
