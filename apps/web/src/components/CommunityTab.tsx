"use client";
import React, { useState, useEffect, useCallback } from "react";
import { IconUsers, IconLock, IconPlus, IconSearch, IconCheck, IconArrowUpRight, IconCopy } from "./icons";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CommunityPost {
  id: string; author: string; authorAlias: string; text: string;
  tokenMint?: string; createdAt: number;
  reactions: { fire: number; gem: number; rug: number };
}

interface Community {
  id: string; name: string; description: string; type: "public" | "private";
  owner: string; emoji: string; color: string; tags: string[];
  createdAt: number; memberCount: number; postCount: number; isMember: boolean;
}

interface CommunityDetail extends Omit<Community, "memberCount" | "postCount"> {
  members: string[]; posts: CommunityPost[];
  isOwner: boolean; inviteCode?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EMOJIS = ["🌐","🎰","⚡","🧪","👁️","🔥","💎","🦍","🐸","🐕","🤖","🏆","🎯","🧠","🚀","💰","📊","🛡️","🌙","⭐"];
const COLORS  = ["#ef4444","#f97316","#eab308","#10b981","#3b82f6","#a855f7","#ec4899","#14b8a6"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1)    return "just now";
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { wallet: string; isMobile: boolean; onNewPost?: () => void; }

export function CommunityTab({ wallet, isMobile, onNewPost }: Props) {
  const [view,        setView]        = useState<"list" | "detail" | "create">("list");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [detail,      setDetail]      = useState<CommunityDetail | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [detailLoad,  setDetailLoad]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterMine,  setFilterMine]  = useState(false);
  const [postText,    setPostText]    = useState("");
  const [posting,     setPosting]     = useState(false);
  const [joinCode,    setJoinCode]    = useState("");
  const [joinError,   setJoinError]   = useState("");
  const [codeCopied,  setCodeCopied]  = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", type: "public" as "public" | "private",
    emoji: "🌐", color: "#a855f7", tags: "",
  });
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState("");

  const alias = (() => {
    try {
      const raw = localStorage.getItem("geass_profile");
      if (raw) { const p = JSON.parse(raw) as { username?: string }; if (p.username) return p.username; }
    } catch {}
    return wallet.slice(0, 8);
  })();

  const loadList = useCallback(() => {
    setLoading(true);
    fetch(`/api/community?wallet=${wallet}`)
      .then(r => r.json())
      .then((d: { communities: Community[] }) => setCommunities(d.communities ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [wallet]);

  useEffect(() => { loadList(); }, [loadList]);

  const openCommunity = (id: string) => {
    setDetailLoad(true); setDetail(null); setView("detail");
    setPostText(""); setJoinCode(""); setJoinError("");
    fetch(`/api/community/${id}?wallet=${wallet}`)
      .then(r => r.json())
      .then((d: CommunityDetail & { error?: string }) => {
        if (d.error) { setView("list"); return; }
        setDetail(d);
      })
      .catch(() => setView("list"))
      .finally(() => setDetailLoad(false));
  };

  const joinCommunity = async (id: string, code?: string) => {
    const res = await fetch(`/api/community/${id}/join`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, inviteCode: code }),
    }).then(r => r.json()) as { ok?: boolean; error?: string };
    if (!res.ok) { setJoinError(res.error ?? "Failed to join"); return; }
    setJoinError(""); setJoinCode("");
    openCommunity(id); loadList();
  };

  const leaveCommunity = async () => {
    if (!detail) return;
    await fetch(`/api/community/${detail.id}/leave`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    openCommunity(detail.id); loadList();
  };

  const submitPost = async () => {
    if (!detail || !postText.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/community/${detail.id}/post`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, alias, text: postText.trim() }),
    }).then(r => r.json()) as { post?: CommunityPost; error?: string };
    if (res.post) {
      setDetail(prev => prev ? { ...prev, posts: [res.post!, ...prev.posts] } : prev);
      setPostText("");
      onNewPost?.();
    }
    setPosting(false);
  };

  const react = async (postId: string, reaction: "fire" | "gem" | "rug") => {
    if (!detail) return;
    await fetch(`/api/community/${detail.id}/react`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, reaction }),
    });
    setDetail(prev => {
      if (!prev) return prev;
      return { ...prev, posts: prev.posts.map(p =>
        p.id === postId ? { ...p, reactions: { ...p.reactions, [reaction]: p.reactions[reaction] + 1 } } : p
      )};
    });
  };

  const createCommunity = async () => {
    if (!form.name.trim()) { setCreateError("Name is required"); return; }
    setCreating(true); setCreateError("");
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const res = await fetch("/api/community", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags, owner: wallet, ownerAlias: alias }),
    }).then(r => r.json()) as { community?: { id: string }; error?: string };
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    loadList();
    if (res.community) openCommunity(res.community.id);
  };

  const filtered = communities.filter(c => {
    if (filterMine && !c.isMember) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.description.toLowerCase().includes(search.toLowerCase()) &&
        !c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const CARD: React.CSSProperties = { background: "#111113", border: "1px solid #1e1e21", borderRadius: 12 };

  // ── CREATE VIEW ──────────────────────────────────────────────────────────────
  if (view === "create") return (
    <div style={{ padding: isMobile ? "14px 14px 80px" : "20px 24px", maxWidth: 540 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => { setView("list"); setCreateError(""); }}
          style={{ background: "transparent", border: "1px solid #27272a", color: "#71717a", borderRadius: 7, padding: "5px 12px", fontSize: 10, cursor: "pointer" }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>Create Community</h2>
      </div>

      {/* Appearance */}
      <div style={{ ...CARD, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10, fontWeight: 700 }}>APPEARANCE</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: form.color + "20", border: `2px solid ${form.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
            {form.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                  style={{ fontSize: 15, padding: 3, borderRadius: 6, border: `1px solid ${form.emoji === e ? form.color : "#27272a"}`, background: form.emoji === e ? form.color + "20" : "transparent", cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: `2px solid ${form.color === c ? "#fff" : "transparent"}`, cursor: "pointer" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ ...CARD, padding: "16px 18px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { label: "COMMUNITY NAME *", key: "name", placeholder: "e.g. Degen Lounge", max: 40 },
          { label: "DESCRIPTION",      key: "description", placeholder: "What is this community about?", max: 200 },
          { label: "TAGS (comma-separated)", key: "tags", placeholder: "meme, solana, alpha", max: 100 },
        ].map(f => (
          <div key={f.key}>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5, fontWeight: 700 }}>{f.label}</div>
            <input value={form[f.key as keyof typeof form] as string}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder} maxLength={f.max}
              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8, padding: "9px 12px", color: "#f4f4f5", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
      </div>

      {/* Privacy */}
      <div style={{ ...CARD, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10, fontWeight: 700 }}>PRIVACY</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["public", "private"] as const).map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
              style={{ padding: "12px", borderRadius: 10, border: `1px solid ${form.type === t ? (t === "private" ? "#f97316" : "#10b981") : "#27272a"}`,
                background: form.type === t ? (t === "private" ? "#f9731615" : "#10b98115") : "transparent",
                color: form.type === t ? (t === "private" ? "#f97316" : "#10b981") : "#52525b", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{t === "public" ? "🌐" : "🔒"}</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{t === "public" ? "Public" : "Private"}</div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: .7 }}>{t === "public" ? "Anyone can join" : "Invite code required"}</div>
            </button>
          ))}
        </div>
      </div>

      {createError && (
        <div style={{ fontSize: 10, color: "#ef4444", background: "#ef444415", border: "1px solid #ef444430", borderRadius: 7, padding: "8px 12px", marginBottom: 12 }}>{createError}</div>
      )}
      <button onClick={createCommunity} disabled={creating}
        style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: creating ? "#27272a" : `linear-gradient(135deg,${form.color},${form.color}88)`,
          color: "#fff", fontSize: 13, fontWeight: 800, cursor: creating ? "wait" : "pointer" }}>
        {creating ? "Creating…" : `${form.emoji} Create Community`}
      </button>
    </div>
  );

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────────
  if (view === "detail") {
    const isMember = detail?.isMember ?? false;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        {/* Header */}
        <div style={{ padding: isMobile ? "12px 14px" : "14px 24px", borderBottom: "1px solid #18181b", background: "#0c0c0e", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { setView("list"); setDetail(null); }}
              style={{ background: "transparent", border: "1px solid #27272a", color: "#71717a", borderRadius: 7, padding: "5px 10px", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>
              ←
            </button>
            {detailLoad ? <span style={{ fontSize: 12, color: "#52525b" }} className="pulse">Loading…</span> : detail ? (
              <>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: detail.color + "20", border: `1px solid ${detail.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {detail.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f5" }}>{detail.name}</span>
                    {detail.type === "private" && <IconLock size={10} />}
                  </div>
                  <div style={{ fontSize: 9, color: "#52525b" }}>{detail.members.length} members · {detail.posts.length} posts</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {isMember && !detail.isOwner && (
                    <button onClick={leaveCommunity}
                      style={{ fontSize: 9, padding: "5px 10px", borderRadius: 7, border: "1px solid #ef444430", background: "#ef444408", color: "#ef4444", cursor: "pointer" }}>Leave</button>
                  )}
                  {detail.isOwner && detail.inviteCode && (
                    <button onClick={() => { navigator.clipboard.writeText(detail.inviteCode!).catch(() => {}); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                      style={{ fontSize: 9, padding: "5px 10px", borderRadius: 7, border: "1px solid #f9731630", background: "#f9731610", color: "#f97316", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      <IconCopy size={9} /> {codeCopied ? "Copied!" : `Code: ${detail.inviteCode}`}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {!detailLoad && detail && !isMember && (
            <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              {detail.type === "private" && (
                <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter invite code"
                  style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 7, padding: "7px 10px", color: "#f4f4f5", fontSize: 11, outline: "none", flex: 1, minWidth: 140 }} />
              )}
              <button onClick={() => joinCommunity(detail.id, joinCode || undefined)}
                style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: detail.color, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Join Community
              </button>
              {joinError && <span style={{ fontSize: 10, color: "#ef4444" }}>{joinError}</span>}
            </div>
          )}
        </div>

        {/* Posts */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 14px" : "14px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!detailLoad && detail?.posts.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 12 }}>No posts yet — be the first!</div>
            </div>
          )}
          {(detail?.posts ?? []).map(post => (
            <div key={post.id} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: (detail?.color ?? "#a855f7") + "20", border: `1px solid ${(detail?.color ?? "#a855f7")}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: detail?.color ?? "#a855f7", flexShrink: 0 }}>
                  {post.authorAlias[0]?.toUpperCase() ?? "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#e4e4e7", display: "flex", alignItems: "center", gap: 6 }}>
                    {post.authorAlias}
                    {post.author === wallet && <span style={{ fontSize: 8, color: "#52525b", background: "#27272a", padding: "1px 5px", borderRadius: 3 }}>you</span>}
                  </div>
                  <div style={{ fontSize: 9, color: "#3f3f46" }}>{timeAgo(post.createdAt)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.6, marginBottom: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.text}</div>
              {post.tokenMint && (
                <a href={`https://pump.fun/${post.tokenMint}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, color: "#a855f7", background: "#a855f715", border: "1px solid #a855f730", padding: "3px 8px", borderRadius: 6, textDecoration: "none", marginBottom: 8 }}>
                  <IconArrowUpRight size={9} /> Token: {post.tokenMint.slice(0, 8)}…
                </a>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                {(["fire", "gem", "rug"] as const).map(r => (
                  <button key={r} onClick={() => react(post.id, r)}
                    style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", cursor: "pointer", color: "#71717a" }}>
                    {r === "fire" ? "🔥" : r === "gem" ? "💎" : "🚩"} {post.reactions[r] || ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Compose — members only */}
        {!detailLoad && detail && isMember && (
          <div style={{ padding: isMobile ? "10px 14px 80px" : "12px 24px", borderTop: "1px solid #18181b", background: "#0c0c0e", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitPost(); } }}
                placeholder="Share alpha, token calls, or ideas… (Enter to post)"
                rows={2} maxLength={500}
                style={{ flex: 1, background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: "9px 12px", color: "#f4f4f5", fontSize: 12, outline: "none", resize: "none", fontFamily: "inherit" }} />
              <button onClick={submitPost} disabled={posting || !postText.trim()}
                style={{ padding: "0 16px", borderRadius: 10, border: "none", background: posting || !postText.trim() ? "#27272a" : (detail.color || "#a855f7"), color: "#fff", fontSize: 11, fontWeight: 700, cursor: posting || !postText.trim() ? "default" : "pointer", flexShrink: 0 }}>
                {posting ? "…" : "Post"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? "14px 14px 80px" : "20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 8 }}>
          <IconUsers size={isMobile ? 16 : 18} /> Community
        </h1>
        <button onClick={() => { setView("create"); setForm({ name: "", description: "", type: "public", emoji: "🌐", color: "#a855f7", tags: "" }); setCreateError(""); }}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid #a855f740", background: "#a855f715", color: "#a855f7", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          <IconPlus size={11} /> New Community
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, background: "#111113", border: "1px solid #1e1e21", borderRadius: 9, padding: "8px 12px" }}>
          <IconSearch size={12} style={{ color: "#3f3f46", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities…"
            style={{ background: "transparent", border: "none", color: "#f4f4f5", fontSize: 12, outline: "none", flex: 1, minWidth: 0 }} />
        </div>
        <button onClick={() => setFilterMine(v => !v)}
          style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${filterMine ? "#a855f740" : "#27272a"}`, background: filterMine ? "#a855f715" : "transparent", color: filterMine ? "#a855f7" : "#52525b", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          {filterMine && <IconCheck size={10} />} My Communities
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { l: "Total",   v: communities.length,                            c: "#3b82f6" },
          { l: "Joined",  v: communities.filter(c => c.isMember).length,    c: "#10b981" },
          { l: "Public",  v: communities.filter(c => c.type === "public").length, c: "#a855f7" },
        ].map(s => (
          <div key={s.l} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}><span className="pulse" style={{ fontSize: 12 }}>Loading…</span></div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 12, marginBottom: 12 }}>{search || filterMine ? "No communities match" : "No communities yet"}</div>
          <button onClick={() => { setView("create"); setCreateError(""); }}
            style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #a855f740", background: "#a855f715", color: "#a855f7", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            + Create one
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(c => (
          <div key={c.id} onClick={() => openCommunity(c.id)}
            style={{ background: "#111113", border: `1px solid ${c.isMember ? c.color + "35" : "#1e1e21"}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color + "20", border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, position: "relative" }}>
              {c.emoji}
              {c.type === "private" && (
                <div style={{ position: "absolute", bottom: -3, right: -3, background: "#f97316", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconLock size={8} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5" }}>{c.name}</span>
                {c.isMember && <span style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "#10b98120", border: "1px solid #10b98140", padding: "1px 6px", borderRadius: 4 }}>MEMBER</span>}
                {c.type === "private" && <span style={{ fontSize: 8, fontWeight: 700, color: "#f97316", background: "#f9731620", border: "1px solid #f9731640", padding: "1px 6px", borderRadius: 4 }}>PRIVATE</span>}
              </div>
              <div style={{ fontSize: 10, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{c.description}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.tags.slice(0, 3).map(t => (
                  <span key={t} style={{ fontSize: 8, color: c.color, background: c.color + "15", border: `1px solid ${c.color}30`, padding: "1px 6px", borderRadius: 4 }}>#{t}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>{c.memberCount}</div>
              <div style={{ fontSize: 9, color: "#3f3f46" }}>members</div>
              <div style={{ fontSize: 9, color: "#3f3f46", marginTop: 2 }}>{c.postCount} posts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
