"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { IconUsers, IconLock, IconPlus, IconSearch, IconCheck, IconArrowUpRight, IconCopy } from "./icons";

// ─── Design tokens ────────────────────────────────────────────────────────────
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";
const RED  = "#ff2b4e";

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey = "popular" | "active" | "newest" | "paid" | "free";

interface Attachment {
  type: "link" | "image" | "file" | "document";
  url:   string;
  name?: string;
  size?: string;
}

interface ChannelMedia {
  id:    string;
  type:  "image" | "video";
  url:   string;
  title?: string;
  addedAt: number;
}

interface CommunityPost {
  id: string; author: string; authorAlias: string; text: string;
  tokenMint?: string; createdAt: number;
  reactions: { fire: number; gem: number; rug: number };
  attachments?: Attachment[];
}

interface Community {
  id: string; name: string; description: string; type: "public" | "private";
  owner: string; emoji: string; color: string; tags: string[];
  createdAt: number; memberCount: number; postCount: number; isMember: boolean;
  price?: number;       // SOL/month — 0 = free
  bannerUrl?: string;
  media?: ChannelMedia[];
}

interface CommunityDetail extends Omit<Community, "memberCount" | "postCount"> {
  members: string[]; posts: CommunityPost[];
  isOwner: boolean; inviteCode?: string;
  media: ChannelMedia[];
}

interface LiveStream {
  id: string; hostAlias: string; hostWallet: string;
  title: string; token?: string; viewerCount: number;
  startedAt: number; tags: string[];
  streamType: "screen" | "cam" | "voice";
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EMOJIS = ["🌐","🎰","⚡","🧪","👁️","🔥","💎","🦍","🐸","🐕","🤖","🏆","🎯","🧠","🚀","💰","📊","🛡️","🌙","⭐"];
const COLORS  = ["#ef4444","#f97316","#eab308","#10b981","#3b82f6","#a855f7","#ec4899","#14b8a6"];
const ATTACH_ICON: Record<Attachment["type"], string> = { link: "🔗", image: "🖼", file: "📎", document: "📄" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1)    return "just now";
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}
function liveTime(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtViewers(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n); }

const inputCss = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: "100%", background: "#0a0a0c", border: "1px solid #28282e",
  color: "#e4e4e7", fontSize: 11, fontFamily: MONO, padding: "8px 10px",
  outline: "none", boxSizing: "border-box", ...extra,
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

// ── Attachment chip ───────────────────────────────────────────────────────────
function AttachmentChip({ a, onRemove }: { a: Attachment; onRemove?: () => void }) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 10, fontFamily: MONO, background: "#0d0d10", border: "1px solid #28282e",
    padding: "3px 8px", cursor: a.url && a.type === "link" ? "pointer" : "default",
  };
  if (a.type === "image" && a.url.startsWith("data:")) return (
    <div style={{ marginTop: 6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.url} alt={a.name ?? "img"} style={{ maxWidth: "100%", maxHeight: 200, border: "1px solid #28282e", display: "block" }} />
      {onRemove && (
        <button onClick={onRemove} style={{ ...base as React.CSSProperties, marginTop: 3 }}>
          <span>🖼</span><span style={{ color: "#a1a1aa" }}>{a.name}</span>
          <span style={{ color: "#52525b", cursor: "pointer" }} onClick={onRemove}>×</span>
        </button>
      )}
    </div>
  );
  return (
    <span style={base} onClick={() => { if (a.url && a.type === "link") window.open(a.url, "_blank"); }}>
      <span>{ATTACH_ICON[a.type]}</span>
      <span style={{ color: "#a1a1aa", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name ?? a.url}</span>
      {a.size && <span style={{ color: "#52525b" }}>{a.size}</span>}
      {onRemove && <span style={{ color: "#52525b", cursor: "pointer" }} onClick={e => { e.stopPropagation(); onRemove(); }}>×</span>}
    </span>
  );
}

// ── Add attachment modal ──────────────────────────────────────────────────────
function AddAttachModal({ type, onAdd, onClose }: { type: Attachment["type"]; onAdd: (a: Attachment) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { onAdd({ type, url: ev.target?.result as string, name: f.name, size: `${(f.size/1024).toFixed(0)}KB` }); onClose(); };
    reader.readAsDataURL(f);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#070708", border: `1px solid #28282e`, width: "min(380px,94vw)", padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "2px", fontWeight: 700 }}>[ ■ ADD {type.toUpperCase()} ]</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {type === "link" ? (
          <>
            <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 5 }}>URL</div>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" style={inputCss({ marginBottom: 10 })} />
            <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 5 }}>LABEL</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Link title (optional)" style={inputCss({ marginBottom: 14 })} />
            <button onClick={() => { if (url.trim()) { onAdd({ type: "link", url: url.trim(), name: name.trim() || undefined }); onClose(); }}}
              disabled={!url.trim()}
              style={{ width: "100%", padding: "9px", border: "none", background: url.trim() ? RED : "#1a1a1e", color: url.trim() ? "#fff" : "#3f3f46", fontSize: 11, fontFamily: MONO, fontWeight: 700, cursor: url.trim() ? "pointer" : "default" }}>
              ADD LINK
            </button>
          </>
        ) : (
          <>
            <input ref={fileRef} type="file"
              accept={type === "image" ? "image/*" : type === "document" ? ".pdf,.doc,.docx,.txt,.md" : "*"}
              onChange={handleFile} style={{ display: "none" }} />
            <div onClick={() => fileRef.current?.click()}
              style={{ border: "1px dashed #28282e", padding: "30px 20px", textAlign: "center", cursor: "pointer", marginBottom: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{ATTACH_ICON[type]}</div>
              <div style={{ fontSize: 10, color: "#71717a", fontFamily: MONO }}>Click to select {type}</div>
              <div style={{ fontSize: 8, color: "#3f3f46", fontFamily: MONO, marginTop: 4 }}>
                {type === "image" ? "PNG, JPG, GIF, WEBP" : type === "document" ? "PDF, DOC, TXT, MD" : "Any file"}
              </div>
            </div>
            <button onClick={() => fileRef.current?.click()}
              style={{ width: "100%", padding: "9px", border: `1px solid ${RED}40`, background: RED + "10", color: RED, fontSize: 11, fontFamily: MONO, fontWeight: 700, cursor: "pointer" }}>
              BROWSE FILES
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Go Live modal ─────────────────────────────────────────────────────────────
function GoLiveModal({ alias, wallet, onStart, onClose }: { alias: string; wallet: string; onStart: (s: LiveStream) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [token, setToken] = useState("");
  const [streamType, setStreamType] = useState<"screen"|"cam"|"voice">("screen");
  const [tags, setTags] = useState("");
  const [starting, setStarting] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const streamKey = `GEASS-${wallet.slice(0,6).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

  const start = () => {
    if (!title.trim()) return;
    setStarting(true);
    setTimeout(() => {
      onStart({ id: Math.random().toString(36).slice(2), hostAlias: alias, hostWallet: wallet, title: title.trim(), token: token.trim() || undefined, viewerCount: 0, startedAt: Date.now(), tags: tags.split(",").map(t=>t.trim()).filter(Boolean), streamType });
      setStarting(false);
    }, 800);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#070708", border: `1px solid ${RED}40`, width: "min(460px,94vw)", padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "2px", fontWeight: 700 }}>[ ■ GO LIVE ]</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 8 }}>STREAM TYPE</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
          {([["screen","🖥","Screen"], ["cam","📹","Webcam"], ["voice","🎙","Voice"]] as const).map(([id,ico,lbl]) => (
            <button key={id} onClick={() => setStreamType(id)}
              style={{ padding: "10px 6px", border: `1px solid ${streamType===id?RED:"#28282e"}`, background: streamType===id?RED+"10":"transparent", color: streamType===id?RED:"#52525b", cursor: "pointer", fontFamily: MONO, textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{ico}</div>
              <div style={{ fontSize: 9, fontWeight: 700 }}>{lbl}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 5 }}>STREAM TITLE *</div>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Analyzing BONK breakout…" style={inputCss({ marginBottom: 12 })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 5 }}>FEATURED TOKEN</div>
            <input value={token} onChange={e => setToken(e.target.value.toUpperCase())} maxLength={10} placeholder="BONK, WIF, SOL…" style={inputCss()} />
          </div>
          <div>
            <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 5 }}>TAGS</div>
            <input value={tags} onChange={e => setTags(e.target.value)} maxLength={60} placeholder="alpha, meme, defi" style={inputCss()} />
          </div>
        </div>
        <div style={{ background: "#0a0a0c", border: "1px solid #28282e", padding: "10px 12px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px" }}>STREAM KEY (OBS / RTMP)</span>
            <button onClick={() => setKeyVisible(v=>!v)} style={{ fontSize: 8, color: "#71717a", background: "transparent", border: "none", cursor: "pointer", fontFamily: MONO }}>{keyVisible?"HIDE":"SHOW"}</button>
          </div>
          <div style={{ fontSize: 10, color: keyVisible ? "#a1a1aa" : "#3f3f46", fontFamily: MONO, letterSpacing: ".5px", userSelect: keyVisible ? "text" : "none" }}>
            {keyVisible ? streamKey : "●●●●●●●●●●●●●●●●●●●●"}
          </div>
        </div>
        <button onClick={start} disabled={starting || !title.trim()}
          style={{ width: "100%", padding: "11px 0", border: "none", background: starting||!title.trim()?"#1a1a1e":RED, color: starting||!title.trim()?"#3f3f46":"#fff", fontSize: 11, fontWeight: 800, fontFamily: MONO, letterSpacing: "1px", cursor: starting||!title.trim()?"default":"pointer" }}>
          {starting ? "INITIALIZING STREAM…" : "● START STREAM"}
        </button>
      </div>
    </div>
  );
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PayModal({ channel, onPaid, onClose }: { channel: Community | CommunityDetail; onPaid: () => void; onClose: () => void }) {
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const pay = () => {
    setPaying(true);
    setTimeout(() => { setDone(true); setPaying(false); setTimeout(onPaid, 1000); }, 1200);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#070708", border: `1px solid ${RED}40`, width: "min(380px,94vw)", padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "2px", fontWeight: 700 }}>[ ■ SUBSCRIBE ]</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, background: "#0a0a0c", border: "1px solid #28282e", padding: "14px" }}>
          <div style={{ width: 44, height: 44, background: channel.color + "20", border: `1px solid ${channel.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {channel.emoji}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#e4e4e7", fontFamily: MONO }}>{channel.name}</div>
            <div style={{ fontSize: 9, color: "#52525b", fontFamily: MONO, marginTop: 2 }}>{"memberCount" in channel ? channel.memberCount : channel.members.length} members</div>
          </div>
        </div>
        <div style={{ background: "#0a0a0c", border: "1px solid #28282e", padding: "14px 16px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: RED, fontFamily: MONO }}>{channel.price?.toFixed(3)} SOL</div>
          <div style={{ fontSize: 9, color: "#52525b", fontFamily: MONO, marginTop: 3 }}>per month · cancel anytime</div>
        </div>
        <div style={{ fontSize: 9, color: "#52525b", fontFamily: MONO, marginBottom: 16, lineHeight: 1.6 }}>
          By subscribing you gain full access to all posts, media, and live streams in this channel.
          Payment is processed via Solana (Phantom / connected wallet).
        </div>
        {done ? (
          <div style={{ textAlign: "center", padding: "12px 0", color: "#10b981", fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>✓ SUBSCRIBED — welcome!</div>
        ) : (
          <button onClick={pay} disabled={paying}
            style={{ width: "100%", padding: "12px 0", border: "none", background: paying ? "#1a1a1e" : RED, color: paying ? "#3f3f46" : "#fff", fontSize: 11, fontWeight: 800, fontFamily: MONO, letterSpacing: "1px", cursor: paying ? "wait" : "pointer" }}>
            {paying ? "PROCESSING…" : `PAY ${channel.price?.toFixed(3)} SOL / MONTH`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Stream card ───────────────────────────────────────────────────────────────
function StreamCard({ stream, onWatch }: { stream: LiveStream; onWatch: () => void }) {
  const typeIcon = stream.streamType === "screen" ? "🖥" : stream.streamType === "cam" ? "📹" : "🎙";
  return (
    <div onClick={onWatch} style={{ background: "#070708", border: `1px solid ${RED}28`, cursor: "pointer", overflow: "hidden" }}>
      <div style={{ height: 100, background: "#0a0a0c", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 28 }}>{typeIcon}</div>
        <div style={{ position: "absolute", top: 5, left: 5, background: RED, color: "#fff", fontSize: 7, fontWeight: 800, fontFamily: MONO, letterSpacing: "1px", padding: "2px 5px" }}>● LIVE</div>
        <div style={{ position: "absolute", top: 5, right: 5, background: "#00000088", color: "#d4d4d8", fontSize: 8, fontFamily: MONO, padding: "2px 6px", border: "1px solid #28282e" }}>
          {fmtViewers(stream.viewerCount)} viewers
        </div>
        <div style={{ position: "absolute", bottom: 5, right: 5, background: "#00000088", color: "#71717a", fontSize: 7, fontFamily: MONO, padding: "2px 5px" }}>
          {liveTime(stream.startedAt)}
        </div>
      </div>
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#e4e4e7", fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>{stream.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 8, color: "#71717a", fontFamily: MONO }}>{stream.hostAlias}</span>
          {stream.token && <span style={{ fontSize: 7, color: RED, background: RED+"12", border: `1px solid ${RED}28`, padding: "1px 4px", fontFamily: MONO }}>${stream.token}</span>}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {stream.tags.slice(0,3).map(t => <span key={t} style={{ fontSize: 7, color: "#52525b", border: "1px solid #28282e", padding: "1px 4px", fontFamily: MONO }}>#{t}</span>)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
interface Props { wallet: string; isMobile: boolean; onNewPost?: () => void; }

export function CommunityTab({ wallet, isMobile, onNewPost }: Props) {
  const [view,         setView]         = useState<"list" | "channel" | "create">("list");
  const [communities,  setCommunities]  = useState<Community[]>([]);
  const [detail,       setDetail]       = useState<CommunityDetail | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [detailLoad,   setDetailLoad]   = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterMine,   setFilterMine]   = useState(false);
  const [sortKey,      setSortKey]      = useState<SortKey>("popular");
  const [postText,     setPostText]     = useState("");
  const [posting,      setPosting]      = useState(false);
  const [joinCode,     setJoinCode]     = useState("");
  const [joinError,    setJoinError]    = useState("");
  const [codeCopied,   setCodeCopied]   = useState(false);

  // Attachment state
  const [attachments,  setAttachments]  = useState<Attachment[]>([]);
  const [attachModal,  setAttachModal]  = useState<Attachment["type"] | null>(null);

  // Live streaming
  const [detailTab,    setDetailTab]    = useState<"about" | "posts" | "media" | "live">("about");
  const [liveStreams,  setLiveStreams]   = useState<LiveStream[]>([]);
  const [goLiveOpen,   setGoLiveOpen]   = useState(false);
  const [watchStream,  setWatchStream]  = useState<LiveStream | null>(null);

  // Payment
  const [payModal,     setPayModal]     = useState(false);

  // Creator — channel media upload
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [localBanner,   setLocalBanner]    = useState<string | null>(null);
  const [localMedia,    setLocalMedia]     = useState<ChannelMedia[]>([]);

  const [form, setForm] = useState({
    name: "", description: "", type: "public" as "public"|"private",
    emoji: "🌐", color: "#a855f7", tags: "", price: "0",
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

  useEffect(() => {
    setLiveStreams([
      { id:"1", hostAlias:"alpha_whale",    hostWallet:"abc", title:"Live TA: BONK breakout setup",        token:"BONK", viewerCount:312, startedAt:Date.now()-2700000, tags:["ta","meme","solana"], streamType:"screen" },
      { id:"2", hostAlias:"degen_trader",   hostWallet:"def", title:"Sniping new launches on Pump.fun",   token:"PUMP", viewerCount:87,  startedAt:Date.now()-900000,  tags:["launch","snipe"],     streamType:"cam"    },
      { id:"3", hostAlias:"geass_sentinel", hostWallet:"ghi", title:"On-chain intel & wallet watching",              viewerCount:54,  startedAt:Date.now()-480000,  tags:["onchain","alpha"],    streamType:"voice"  },
    ]);
  }, []);

  const openChannel = (id: string) => {
    setDetailLoad(true); setDetail(null); setView("channel");
    setPostText(""); setJoinCode(""); setJoinError("");
    setAttachments([]); setDetailTab("about"); setLocalMedia([]);
    fetch(`/api/community/${id}?wallet=${wallet}`)
      .then(r => r.json())
      .then((d: CommunityDetail & { error?: string }) => {
        if (d.error) { setView("list"); return; }
        setDetail({ ...d, media: d.media ?? [] });
      })
      .catch(() => setView("list"))
      .finally(() => setDetailLoad(false));
  };

  const joinChannel = async (id: string, code?: string) => {
    const res = await fetch(`/api/community/${id}/join`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, inviteCode: code }),
    }).then(r => r.json()) as { ok?: boolean; error?: string };
    if (!res.ok) { setJoinError(res.error ?? "Failed to join"); return; }
    setJoinError(""); setJoinCode("");
    openChannel(id); loadList();
  };

  const leaveChannel = async () => {
    if (!detail) return;
    await fetch(`/api/community/${detail.id}/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet }) });
    openChannel(detail.id); loadList();
  };

  const submitPost = async () => {
    if (!detail || !postText.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/community/${detail.id}/post`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, alias, text: postText.trim(), attachments }),
    }).then(r => r.json()) as { post?: CommunityPost; error?: string };
    if (res.post) {
      setDetail(prev => prev ? { ...prev, posts: [{ ...res.post!, attachments }, ...prev.posts] } : prev);
      setPostText(""); setAttachments([]);
      onNewPost?.();
    }
    setPosting(false);
  };

  const react = async (postId: string, reaction: "fire"|"gem"|"rug") => {
    if (!detail) return;
    await fetch(`/api/community/${detail.id}/react`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, reaction }) });
    setDetail(prev => prev ? { ...prev, posts: prev.posts.map(p => p.id === postId ? { ...p, reactions: { ...p.reactions, [reaction]: p.reactions[reaction]+1 } } : p) } : prev);
  };

  const createCommunity = async () => {
    if (!form.name.trim()) { setCreateError("Name is required"); return; }
    setCreating(true); setCreateError("");
    const price = parseFloat(form.price) || 0;
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const res = await fetch("/api/community", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price, tags, owner: wallet, ownerAlias: alias }),
    }).then(r => r.json()) as { community?: { id: string }; error?: string };
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    loadList();
    if (res.community) openChannel(res.community.id);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setLocalBanner(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const isVideo = f.type.startsWith("video/");
      setLocalMedia(prev => [...prev, { id: Math.random().toString(36).slice(2), type: isVideo ? "video" : "image", url: ev.target?.result as string, title: f.name, addedAt: Date.now() }]);
      setUploadingMedia(false);
    };
    reader.readAsDataURL(f);
  };

  // ── Sort + filter ────────────────────────────────────────────────────────────
  const filtered = communities
    .filter(c => {
      if (filterMine && !c.isMember) return false;
      if (sortKey === "paid" && !(c.price && c.price > 0)) return false;
      if (sortKey === "free" && (c.price && c.price > 0)) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
          !c.description.toLowerCase().includes(search.toLowerCase()) &&
          !c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "active")  return b.postCount - a.postCount;
      if (sortKey === "newest")  return b.createdAt - a.createdAt;
      return b.memberCount - a.memberCount; // popular / paid / free
    });

  const isPaid   = !!(detail?.price && detail.price > 0);
  const isMember = detail?.isMember ?? false;
  const isOwner  = detail?.isOwner ?? false;
  const allMedia = [...(detail?.media ?? []), ...localMedia];

  const P: React.CSSProperties = { background: "#070708", border: "1px solid #18181c" };

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === "create") return (
    <div style={{ padding: isMobile ? "14px 14px 80px" : "20px 24px", maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => { setView("list"); setCreateError(""); }}
          style={{ background: "transparent", border: "1px solid #28282e", color: "#71717a", padding: "5px 12px", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>
          ← BACK
        </button>
        <div style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "2px", fontWeight: 700 }}>[ ■ CREATE CHANNEL ]</div>
      </div>

      {/* Appearance */}
      <div style={{ ...P, padding: "16px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>APPEARANCE</div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 48, height: 48, background: form.color+"20", border: `1px solid ${form.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            {form.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {EMOJIS.map(e => <button key={e} onClick={() => setForm(f=>({...f,emoji:e}))} style={{ fontSize: 13, padding: 3, border: `1px solid ${form.emoji===e?form.color:"#28282e"}`, background: form.emoji===e?form.color+"20":"transparent", cursor: "pointer" }}>{e}</button>)}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {COLORS.map(c => <button key={c} onClick={() => setForm(f=>({...f,color:c}))} style={{ width: 20, height: 20, background: c, border: `2px solid ${form.color===c?"#fff":"transparent"}`, cursor: "pointer" }} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Banner upload */}
      <div style={{ ...P, padding: "14px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>CHANNEL BANNER</div>
        <input ref={bannerFileRef} type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: "none" }} />
        {localBanner ? (
          <div style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={localBanner} alt="banner" style={{ width: "100%", height: 90, objectFit: "cover", display: "block", border: "1px solid #28282e" }} />
            <button onClick={() => setLocalBanner(null)} style={{ position: "absolute", top: 4, right: 4, background: "#000000aa", border: "none", color: "#fff", fontSize: 12, width: 22, height: 22, cursor: "pointer" }}>×</button>
          </div>
        ) : (
          <div onClick={() => bannerFileRef.current?.click()} style={{ border: "1px dashed #28282e", height: 70, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 18 }}>🖼</div>
            <div style={{ fontSize: 9, color: "#52525b", fontFamily: MONO }}>Upload banner image</div>
          </div>
        )}
      </div>

      {/* Fields */}
      <div style={{ ...P, padding: "16px 18px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { label: "CHANNEL NAME *",        key: "name",        placeholder: "e.g. Degen Lounge",            max: 40  },
          { label: "DESCRIPTION",           key: "description", placeholder: "What is this channel about?",  max: 300 },
          { label: "TAGS (comma-separated)", key: "tags",       placeholder: "meme, solana, alpha",           max: 100 },
        ].map(f => (
          <div key={f.key}>
            <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1.5px", marginBottom: 5, fontFamily: MONO }}>{f.label}</div>
            <input value={form[f.key as keyof typeof form] as string}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder} maxLength={f.max}
              style={inputCss()} />
          </div>
        ))}
      </div>

      {/* Privacy + price */}
      <div style={{ ...P, padding: "14px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>PRIVACY & ACCESS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {(["public","private"] as const).map(t => (
            <button key={t} onClick={() => setForm(f=>({...f,type:t}))}
              style={{ padding: "10px", border: `1px solid ${form.type===t?(t==="private"?"#f97316":"#10b981"):"#28282e"}`, background: form.type===t?(t==="private"?"#f9731610":"#10b98110"):"transparent", color: form.type===t?(t==="private"?"#f97316":"#10b981"):"#52525b", cursor: "pointer", textAlign: "left", fontFamily: MONO }}>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{t==="public"?"🌐":"🔒"}</div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{t==="public"?"Public":"Private"}</div>
              <div style={{ fontSize: 8, opacity: .7, marginTop: 2 }}>{t==="public"?"Anyone can join":"Invite code required"}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1.5px", marginBottom: 5, fontFamily: MONO }}>SUBSCRIPTION PRICE (SOL/month)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="number" min="0" step="0.001" value={form.price}
            onChange={e => setForm(f=>({...f,price:e.target.value}))}
            placeholder="0 = free"
            style={inputCss({ flex: 1, appearance: "none" })} />
          <span style={{ fontSize: 9, color: "#52525b", fontFamily: MONO, whiteSpace: "nowrap" }}>
            {parseFloat(form.price) > 0 ? "💰 PAID" : "FREE"}
          </span>
        </div>
        <div style={{ fontSize: 8, color: "#3f3f46", fontFamily: MONO, marginTop: 5 }}>Set 0 to keep the channel free. Subscribers pay via Solana wallet.</div>
      </div>

      {createError && <div style={{ fontSize: 10, color: "#ef4444", background: "#ef444410", border: "1px solid #ef444428", padding: "8px 12px", marginBottom: 12, fontFamily: MONO }}>{createError}</div>}
      <button onClick={createCommunity} disabled={creating}
        style={{ width: "100%", padding: 12, border: "none", background: creating?"#1a1a1e":RED, color: creating?"#3f3f46":"#fff", fontSize: 11, fontWeight: 800, cursor: creating?"wait":"pointer", fontFamily: MONO, letterSpacing: "1px" }}>
        {creating ? "CREATING…" : `${form.emoji} CREATE CHANNEL`}
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === "channel") {
    const canAccess = isMember || !isPaid;

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        {/* Modals */}
        {attachModal && <AddAttachModal type={attachModal} onAdd={a => { setAttachments(prev=>[...prev,a]); setAttachModal(null); }} onClose={() => setAttachModal(null)} />}
        {goLiveOpen  && <GoLiveModal alias={alias} wallet={wallet} onStart={s => { setLiveStreams(p=>[s,...p]); setGoLiveOpen(false); setWatchStream(s); }} onClose={() => setGoLiveOpen(false)} />}
        {payModal    && detail && <PayModal channel={detail} onPaid={() => { setPayModal(false); openChannel(detail.id); }} onClose={() => setPayModal(false)} />}

        {/* Back bar */}
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #18181c", background: "#050506", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setView("list"); setDetail(null); setWatchStream(null); }}
            style={{ background: "transparent", border: "1px solid #28282e", color: "#71717a", padding: "4px 10px", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>
            ← CHANNELS
          </button>
          {detail && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14 }}>{detail.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7", fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail.name}</span>
              {isPaid && <span style={{ fontSize: 7, color: "#f97316", background: "#f9731612", border: "1px solid #f9731628", padding: "1px 5px", fontFamily: MONO, flexShrink: 0 }}>PAID</span>}
              {detail.type === "private" && <IconLock size={9} />}
            </div>
          )}
          {detail && isMember && !isOwner && (
            <button onClick={leaveChannel} style={{ fontSize: 8, padding: "4px 8px", border: "1px solid #ef444428", background: "#ef444408", color: "#ef4444", cursor: "pointer", fontFamily: MONO, flexShrink: 0 }}>LEAVE</button>
          )}
          {detail && isOwner && detail.inviteCode && (
            <button onClick={() => { navigator.clipboard.writeText(detail.inviteCode!).catch(()=>{}); setCodeCopied(true); setTimeout(()=>setCodeCopied(false),2000); }}
              style={{ fontSize: 8, padding: "4px 8px", border: "1px solid #f9731628", background: "#f9731610", color: "#f97316", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, flexShrink: 0 }}>
              <IconCopy size={8} />{codeCopied ? "COPIED" : `INVITE: ${detail.inviteCode}`}
            </button>
          )}
        </div>

        {detailLoad ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#3f3f46", fontFamily: MONO }} className="pulse">LOADING CHANNEL…</span>
          </div>
        ) : detail ? (
          <>
            {/* Banner */}
            {(localBanner ?? detail.bannerUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={localBanner ?? detail.bannerUrl} alt="banner" style={{ width: "100%", height: isMobile ? 80 : 120, objectFit: "cover", flexShrink: 0, borderBottom: "1px solid #18181c" }} />
            )}

            {/* Channel header info */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #18181c", background: "#050506", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 52, height: 52, background: detail.color+"20", border: `2px solid ${detail.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                  {detail.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: "#f4f4f5", fontFamily: MONO }}>{detail.name}</span>
                    {isPaid && <span style={{ fontSize: 8, color: "#f97316", background: "#f9731612", border: "1px solid #f9731628", padding: "2px 6px", fontFamily: MONO }}>💰 {detail.price?.toFixed(3)} SOL/mo</span>}
                    {detail.type==="private" && <span style={{ fontSize: 8, color: "#71717a", background: "#1a1a1e", border: "1px solid #28282e", padding: "2px 6px", fontFamily: MONO }}>PRIVATE</span>}
                    {isMember && <span style={{ fontSize: 8, color: "#10b981", background: "#10b98110", border: "1px solid #10b98128", padding: "2px 6px", fontFamily: MONO }}>✓ MEMBER</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#71717a", fontFamily: MONO, marginBottom: 6, lineHeight: 1.5 }}>{detail.description}</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, color: "#52525b", fontFamily: MONO }}><span style={{ color: "#a1a1aa", fontWeight: 700 }}>{detail.members.length}</span> members</span>
                    <span style={{ fontSize: 9, color: "#52525b", fontFamily: MONO }}><span style={{ color: "#a1a1aa", fontWeight: 700 }}>{detail.posts.length}</span> posts</span>
                    <span style={{ fontSize: 9, color: "#52525b", fontFamily: MONO }}><span style={{ color: RED, fontWeight: 700 }}>{liveStreams.length}</span> live</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {detail.tags.map(t => <span key={t} style={{ fontSize: 7, color: detail.color, background: detail.color+"12", border: `1px solid ${detail.color}28`, padding: "1px 5px", fontFamily: MONO }}>#{t}</span>)}
                  </div>
                </div>
              </div>

              {/* Join / Subscribe CTA */}
              {!isMember && (
                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {detail.type==="private" && (
                    <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Invite code"
                      style={inputCss({ flex: 1, minWidth: 120, padding: "6px 10px" })} />
                  )}
                  {isPaid ? (
                    <button onClick={() => setPayModal(true)}
                      style={{ padding: "8px 18px", border: "none", background: "#f97316", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: MONO }}>
                      💰 SUBSCRIBE — {detail.price?.toFixed(3)} SOL/mo
                    </button>
                  ) : (
                    <button onClick={() => joinChannel(detail.id, joinCode||undefined)}
                      style={{ padding: "8px 18px", border: "none", background: detail.color, color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: MONO }}>
                      JOIN CHANNEL
                    </button>
                  )}
                  {joinError && <span style={{ fontSize: 9, color: "#ef4444", fontFamily: MONO }}>{joinError}</span>}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #18181c", background: "#050506", flexShrink: 0, overflowX: "auto" }}>
              {([["about","ABOUT"],["posts","POSTS"],["media","MEDIA"],["live","LIVE"]] as const).map(([id,lbl]) => (
                <button key={id} onClick={() => { setDetailTab(id); setWatchStream(null); }}
                  style={{ padding: "8px 16px", border: "none", borderBottom: detailTab===id?`2px solid ${RED}`:"2px solid transparent", background: "transparent", color: detailTab===id?RED:"#52525b", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: MONO, letterSpacing: "1px", whiteSpace: "nowrap", position: "relative" }}>
                  {lbl}
                  {id==="live" && liveStreams.length > 0 && <span style={{ marginLeft: 4, background: RED, color: "#fff", fontSize: 7, fontWeight: 800, padding: "1px 4px" }}>{liveStreams.length}</span>}
                </button>
              ))}
            </div>

            {/* Paywall overlay if paid and not member (except about) */}
            {isPaid && !isMember && detailTab !== "about" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
                <div style={{ fontSize: 28 }}>🔒</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7", fontFamily: MONO }}>Premium Content</div>
                <div style={{ fontSize: 10, color: "#71717a", fontFamily: MONO, textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
                  Subscribe to access posts, media, and live streams in this channel.
                </div>
                <button onClick={() => setPayModal(true)}
                  style={{ padding: "10px 24px", border: "none", background: "#f97316", color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: MONO }}>
                  💰 SUBSCRIBE — {detail.price?.toFixed(3)} SOL/mo
                </button>
              </div>
            )}

            {/* ── ABOUT TAB ─────────────────────────────────────────────────── */}
            {detailTab === "about" && (
              <div style={{ flex: 1, overflowY: "auto", padding: isMobile?"12px":"16px 20px" }}>
                {isOwner && (
                  <div style={{ background: "#0a0a0c", border: `1px solid ${RED}28`, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 8, color: RED, fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 10 }}>[ ■ CHANNEL MANAGEMENT ]</div>

                    {/* Banner upload */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, marginBottom: 6 }}>BANNER IMAGE</div>
                      <input ref={bannerFileRef} type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: "none" }} />
                      <button onClick={() => bannerFileRef.current?.click()}
                        style={{ padding: "6px 12px", border: "1px solid #28282e", background: "transparent", color: "#71717a", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>
                        🖼 UPLOAD BANNER
                      </button>
                      {localBanner && <span style={{ fontSize: 9, color: "#10b981", fontFamily: MONO, marginLeft: 8 }}>✓ Uploaded</span>}
                    </div>

                    {/* Media upload */}
                    <div>
                      <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, marginBottom: 6 }}>ADD PHOTO / VIDEO</div>
                      <input ref={mediaFileRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} style={{ display: "none" }} />
                      <button onClick={() => mediaFileRef.current?.click()} disabled={uploadingMedia}
                        style={{ padding: "6px 12px", border: "1px solid #28282e", background: "transparent", color: "#71717a", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>
                        {uploadingMedia ? "UPLOADING…" : "📸 ADD MEDIA"}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ ...P, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 10 }}>CHANNEL INFO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", alignItems: "start" }}>
                    {[
                      ["OWNER",    detail.owner.slice(0,8) + "…"],
                      ["TYPE",     detail.type.toUpperCase()],
                      ["MEMBERS",  String(detail.members.length)],
                      ["POSTS",    String(detail.posts.length)],
                      ["ACCESS",   isPaid ? `${detail.price?.toFixed(3)} SOL/mo` : "FREE"],
                      ["CREATED",  new Date(detail.createdAt).toLocaleDateString()],
                    ].map(([k,v]) => (
                      <React.Fragment key={k}>
                        <span style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1px", whiteSpace: "nowrap" }}>{k}</span>
                        <span style={{ fontSize: 10, color: "#a1a1aa", fontFamily: MONO }}>{v}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {detail.description && (
                  <div style={{ ...P, padding: "14px 16px" }}>
                    <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 8 }}>DESCRIPTION</div>
                    <div style={{ fontSize: 11, color: "#d4d4d8", fontFamily: MONO, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{detail.description}</div>
                  </div>
                )}
              </div>
            )}

            {/* ── MEDIA TAB ─────────────────────────────────────────────────── */}
            {detailTab === "media" && (canAccess || !isPaid) && (
              <div style={{ flex: 1, overflowY: "auto", padding: isMobile?"10px":"14px 18px" }}>
                {isOwner && (
                  <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
                    <input ref={mediaFileRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} style={{ display: "none" }} />
                    <button onClick={() => mediaFileRef.current?.click()} disabled={uploadingMedia}
                      style={{ padding: "7px 14px", border: `1px solid ${RED}30`, background: RED+"0c", color: RED, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: MONO }}>
                      {uploadingMedia ? "UPLOADING…" : "+ ADD PHOTO / VIDEO"}
                    </button>
                  </div>
                )}

                {allMedia.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🖼</div>
                    <div style={{ fontSize: 11, fontFamily: MONO }}>No media yet</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 6 }}>
                    {allMedia.map(m => (
                      <div key={m.id} style={{ background: "#0a0a0c", border: "1px solid #28282e", overflow: "hidden" }}>
                        {m.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.url} alt={m.title} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                        ) : (
                          <video src={m.url} controls style={{ width: "100%", height: 110, background: "#000", display: "block" }} />
                        )}
                        {m.title && <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, padding: "4px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── LIVE TAB ──────────────────────────────────────────────────── */}
            {detailTab === "live" && (canAccess || !isPaid) && (
              <div style={{ flex: 1, overflowY: "auto", padding: isMobile?"10px":"14px 18px" }}>
                {watchStream ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <button onClick={() => setWatchStream(null)} style={{ background: "transparent", border: "1px solid #28282e", color: "#71717a", padding: "4px 10px", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>← BACK</button>
                      <div style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "1px" }}>● LIVE — {fmtViewers(watchStream.viewerCount)} VIEWERS</div>
                    </div>
                    <div style={{ background: "#0a0a0c", border: "1px solid #28282e", height: isMobile?180:300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, marginBottom: 12, position: "relative" }}>
                      <div style={{ fontSize: 40 }}>{watchStream.streamType==="screen"?"🖥":watchStream.streamType==="cam"?"📹":"🎙"}</div>
                      <div style={{ fontSize: 10, color: "#71717a", fontFamily: MONO }}>CONNECTING TO STREAM…</div>
                      <div style={{ position: "absolute", top: 8, left: 8, background: RED, color: "#fff", fontSize: 8, fontFamily: MONO, fontWeight: 800, padding: "2px 6px", letterSpacing: "1px" }}>● LIVE</div>
                      <div style={{ position: "absolute", top: 8, right: 8, background: "#00000099", color: "#a1a1aa", fontSize: 9, fontFamily: MONO, padding: "2px 8px", border: "1px solid #28282e" }}>{fmtViewers(watchStream.viewerCount)} viewers</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#e4e4e7", fontFamily: MONO, marginBottom: 4 }}>{watchStream.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: "#71717a", fontFamily: MONO }}>{watchStream.hostAlias}</span>
                      {watchStream.token && <span style={{ fontSize: 9, color: RED, background: RED+"12", border: `1px solid ${RED}28`, padding: "1px 6px", fontFamily: MONO }}>${watchStream.token}</span>}
                      <span style={{ fontSize: 8, color: "#3f3f46", fontFamily: MONO }}>{liveTime(watchStream.startedAt)} live</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {watchStream.tags.map(t=><span key={t} style={{ fontSize: 8, color: "#52525b", border: "1px solid #28282e", padding: "1px 5px", fontFamily: MONO }}>#{t}</span>)}
                    </div>
                  </div>
                ) : (
                  <>
                    {isMember && (
                      <div style={{ background: RED+"08", border: `1px solid ${RED}22`, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 22 }}>📡</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#e4e4e7", fontFamily: MONO }}>Start a Live Stream</div>
                          <div style={{ fontSize: 9, color: "#71717a", fontFamily: MONO, marginTop: 2 }}>Share your screen, TA, or wallet watching — live with OBS / RTMP.</div>
                        </div>
                        <button onClick={() => setGoLiveOpen(true)}
                          style={{ padding: "8px 16px", border: "none", background: RED, color: "#fff", fontSize: 10, fontWeight: 800, fontFamily: MONO, letterSpacing: "1px", cursor: "pointer", flexShrink: 0 }}>
                          ● GO LIVE
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: 8, color: "#52525b", fontFamily: MONO, letterSpacing: "1.5px", marginBottom: 10 }}>LIVE NOW — {liveStreams.length} STREAM{liveStreams.length!==1?"S":""}</div>
                    {liveStreams.length===0 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px" }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📡</div>
                        <div style={{ fontSize: 11, color: "#3f3f46", fontFamily: MONO }}>No active streams — be the first!</div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr":"repeat(2,1fr)", gap: 10 }}>
                        {liveStreams.map(s=><StreamCard key={s.id} stream={s} onWatch={()=>setWatchStream(s)} />)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── POSTS TAB ─────────────────────────────────────────────────── */}
            {detailTab === "posts" && (canAccess || !isPaid) && (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: isMobile?"10px 12px":"12px 18px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {detail.posts.length===0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46" }}>
                      <div style={{ fontSize: 22, marginBottom: 8 }}>💬</div>
                      <div style={{ fontSize: 11, fontFamily: MONO }}>No posts yet — be the first!</div>
                    </div>
                  )}
                  {detail.posts.map(post => (
                    <div key={post.id} style={{ background: "#070708", border: "1px solid #18181c", padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                        <div style={{ width: 26, height: 26, background: detail.color+"20", border: `1px solid ${detail.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: detail.color, flexShrink: 0, fontFamily: MONO }}>
                          {post.authorAlias[0]?.toUpperCase()??"?"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#e4e4e7", display: "flex", alignItems: "center", gap: 5, fontFamily: MONO }}>
                            {post.authorAlias}
                            {post.author===wallet && <span style={{ fontSize: 7, color: "#3f3f46", background: "#18181c", padding: "1px 4px" }}>YOU</span>}
                          </div>
                          <div style={{ fontSize: 8, color: "#3f3f46", fontFamily: MONO }}>{timeAgo(post.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#d4d4d8", lineHeight: 1.6, marginBottom: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.text}</div>
                      {post.attachments && post.attachments.length>0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                          {post.attachments.map((a,i)=><AttachmentChip key={i} a={a} />)}
                        </div>
                      )}
                      {post.tokenMint && (
                        <a href={`https://pump.fun/${post.tokenMint}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 8, color: "#a855f7", background: "#a855f710", border: "1px solid #a855f726", padding: "2px 7px", textDecoration: "none", marginBottom: 8, fontFamily: MONO }}>
                          <IconArrowUpRight size={8}/> TOKEN: {post.tokenMint.slice(0,8)}…
                        </a>
                      )}
                      <div style={{ display: "flex", gap: 5 }}>
                        {(["fire","gem","rug"] as const).map(r=>(
                          <button key={r} onClick={()=>react(post.id,r)} style={{ fontSize: 10, padding: "2px 7px", border: "1px solid #28282e", background: "transparent", cursor: "pointer", color: "#71717a", fontFamily: MONO }}>
                            {r==="fire"?"🔥":r==="gem"?"💎":"🚩"} {post.reactions[r]||""}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Compose */}
                {isMember && (
                  <div style={{ padding: isMobile?"8px 12px 72px":"10px 18px", borderTop: "1px solid #18181c", background: "#050506", flexShrink: 0 }}>
                    {attachments.length>0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {attachments.map((a,i)=><AttachmentChip key={i} a={a} onRemove={()=>setAttachments(prev=>prev.filter((_,j)=>j!==i))} />)}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                      <textarea value={postText} onChange={e=>setPostText(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitPost();} }}
                        placeholder="Share alpha, calls, or ideas… (Enter to post)"
                        rows={2} maxLength={500}
                        style={{ flex: 1, background: "#0a0a0c", border: "1px solid #28282e", padding: "8px 10px", color: "#e4e4e7", fontSize: 11, outline: "none", resize: "none", fontFamily: MONO }} />
                      <button onClick={submitPost} disabled={posting||!postText.trim()}
                        style={{ padding: "0 14px", height: 54, border: "none", background: posting||!postText.trim()?"#1a1a1e":RED, color: posting||!postText.trim()?"#3f3f46":"#fff", fontSize: 10, fontWeight: 800, cursor: posting||!postText.trim()?"default":"pointer", flexShrink: 0, fontFamily: MONO }}>
                        {posting?"…":"POST"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "center" }}>
                      <span style={{ fontSize: 7, color: "#3f3f46", fontFamily: MONO, letterSpacing: "1px", marginRight: 4 }}>ATTACH:</span>
                      {([["link","🔗","Link"],["image","🖼","Image"],["file","📎","File"],["document","📄","Doc"]] as const).map(([type,ico,lbl])=>(
                        <button key={type} onClick={()=>setAttachModal(type)}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 7px", border: "1px solid #28282e", background: "transparent", color: "#71717a", fontSize: 9, cursor: "pointer", fontFamily: MONO }}>
                          {ico} {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: isMobile?"12px 12px 80px":"18px 22px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 9, color: RED, fontFamily: MONO, letterSpacing: "2px", fontWeight: 700 }}>[ ■ CHANNELS ]</div>
        <button onClick={()=>{ setView("create"); setForm({name:"",description:"",type:"public",emoji:"🌐",color:"#a855f7",tags:"",price:"0"}); setCreateError(""); setLocalBanner(null); }}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: `1px solid ${RED}30`, background: RED+"0c", color: RED, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: MONO }}>
          <IconPlus size={10}/> NEW CHANNEL
        </button>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160, display: "flex", alignItems: "center", gap: 7, background: "#070708", border: "1px solid #18181c", padding: "7px 10px" }}>
          <IconSearch size={11} style={{ color: "#3f3f46", flexShrink: 0 }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search channels…"
            style={{ background: "transparent", border: "none", color: "#e4e4e7", fontSize: 11, outline: "none", flex: 1, minWidth: 0, fontFamily: MONO }}/>
        </div>
        <button onClick={()=>setFilterMine(v=>!v)}
          style={{ padding: "7px 12px", border: `1px solid ${filterMine?RED+"40":"#28282e"}`, background: filterMine?RED+"0c":"transparent", color: filterMine?RED:"#52525b", fontSize: 9, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, fontFamily: MONO }}>
          {filterMine && <IconCheck size={9}/>} MINE
        </button>
      </div>

      {/* Sort bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {([["popular","POPULAR"],["active","ACTIVE"],["newest","NEWEST"],["paid","PAID"],["free","FREE"]] as const).map(([k,lbl])=>(
          <button key={k} onClick={()=>setSortKey(k)}
            style={{ padding: "4px 10px", border: `1px solid ${sortKey===k?RED+"50":"#28282e"}`, background: sortKey===k?RED+"0c":"transparent", color: sortKey===k?RED:"#52525b", fontSize: 8, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: MONO, letterSpacing: ".5px" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 16 }}>
        {[
          { l: "TOTAL",  v: communities.length,                             c: "#3b82f6" },
          { l: "JOINED", v: communities.filter(c=>c.isMember).length,      c: "#10b981" },
          { l: "PAID",   v: communities.filter(c=>c.price&&c.price>0).length, c: "#f97316" },
        ].map(s=>(
          <div key={s.l} style={{ background: "#070708", border: "1px solid #18181c", padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.c, fontFamily: MONO }}>{s.v}</div>
            <div style={{ fontSize: 7, color: "#52525b", letterSpacing: "1.5px", fontFamily: MONO }}>{s.l}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px 20px", color: "#3f3f46", fontFamily: MONO, fontSize: 11 }} className="pulse">LOADING…</div>}

      {!loading && filtered.length===0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>📡</div>
          <div style={{ fontSize: 11, color: "#3f3f46", fontFamily: MONO, marginBottom: 12 }}>{search||filterMine?"No channels match":"No channels yet"}</div>
          <button onClick={()=>{ setView("create"); setCreateError(""); }}
            style={{ padding: "7px 16px", border: `1px solid ${RED}30`, background: RED+"0c", color: RED, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: MONO }}>
            + CREATE ONE
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map(c=>(
          <div key={c.id} onClick={()=>openChannel(c.id)}
            style={{ background: "#070708", border: `1px solid ${c.isMember?c.color+"30":"#18181c"}`, cursor: "pointer", overflow: "hidden" }}>
            {/* Banner thumbnail */}
            {c.bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.bannerUrl} alt="" style={{ width: "100%", height: 44, objectFit: "cover", display: "block", borderBottom: "1px solid #18181c" }}/>
            )}
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, background: c.color+"20", border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, position: "relative" }}>
                {c.emoji}
                {c.type==="private" && (
                  <div style={{ position: "absolute", bottom: -3, right: -3, background: "#f97316", width: 12, height: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconLock size={7}/>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7", fontFamily: MONO }}>{c.name}</span>
                  {c.isMember && <span style={{ fontSize: 7, fontWeight: 700, color: "#10b981", background: "#10b98110", border: "1px solid #10b98126", padding: "1px 5px", fontFamily: MONO }}>MEMBER</span>}
                  {c.type==="private" && <span style={{ fontSize: 7, fontWeight: 700, color: "#f97316", background: "#f9731610", border: "1px solid #f9731626", padding: "1px 5px", fontFamily: MONO }}>PRIVATE</span>}
                  {c.price && c.price>0 && <span style={{ fontSize: 7, fontWeight: 700, color: "#f97316", background: "#f9731610", border: "1px solid #f9731626", padding: "1px 5px", fontFamily: MONO }}>💰 {c.price.toFixed(3)} SOL</span>}
                </div>
                <div style={{ fontSize: 9, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4, fontFamily: MONO }}>{c.description}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {c.tags.slice(0,3).map(t=><span key={t} style={{ fontSize: 7, color: c.color, background: c.color+"10", border: `1px solid ${c.color}26`, padding: "1px 5px", fontFamily: MONO }}>#{t}</span>)}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", fontFamily: MONO }}>{c.memberCount}</div>
                <div style={{ fontSize: 8, color: "#3f3f46", fontFamily: MONO }}>members</div>
                <div style={{ fontSize: 8, color: "#3f3f46", marginTop: 2, fontFamily: MONO }}>{c.postCount} posts</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
