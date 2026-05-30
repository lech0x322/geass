"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Listing, ListingCategory, ListingReview } from "@/lib/server/marketplace";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  wallet: string;
  walletAlias?: string;
  isMobile: boolean;
}

type View = "list" | "detail" | "create";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { id: ListingCategory | "all"; label: string; emoji: string }[] = [
  { id: "all",       label: "All",       emoji: "🌐" },
  { id: "launch",    label: "Launch",    emoji: "🚀" },
  { id: "promotion", label: "Promotion", emoji: "📣" },
  { id: "design",    label: "Design",    emoji: "🎨" },
  { id: "technical", label: "Technical", emoji: "⚙️" },
  { id: "alpha",     label: "Alpha",     emoji: "💡" },
  { id: "audit",     label: "Audit",     emoji: "🔒" },
  { id: "other",     label: "Other",     emoji: "📦" },
];

const CAT_COLOR: Record<ListingCategory, string> = {
  launch:    "#ff2b4e",
  promotion: "#f97316",
  design:    "#a855f7",
  technical: "#3b82f6",
  alpha:     "#eab308",
  audit:     "#10b981",
  other:     "#71717a",
};

const DELIVERY_OPTIONS = ["instant", "1h", "3h", "6h", "12h", "24h", "48h", "72h", "1 week"];
const CONTACT_METHODS: { id: "telegram" | "discord" | "dm"; label: string }[] = [
  { id: "telegram", label: "Telegram" },
  { id: "discord",  label: "Discord"  },
  { id: "dm",       label: "DM"       },
];
const EMOJI_OPTIONS = ["🚀","📣","🎨","⚙️","💡","🔒","📦","💎","🔥","⚡","🎯","🛡️","🤖","📊","💰","🌐"];

const RECOMMENDED_TAGS: Record<ListingCategory, string[]> = {
  launch:    ["pump.fun", "raydium", "LP", "jito", "bundle", "meteora", "metadata", "stealth"],
  promotion: ["kol", "call", "twitter", "spaces", "shill", "influencer", "trending", "raid"],
  design:    ["logo", "memes", "banner", "branding", "art", "animation", "pfp", "gif"],
  technical: ["sniper", "mev", "bot", "bundle", "smart-contract", "telegram-bot", "api", "dashboard"],
  alpha:     ["signals", "calls", "subscription", "whale-alerts", "presale", "private", "vip"],
  audit:     ["security", "honeypot", "rug-check", "verified", "report", "mint-check", "lp-lock"],
  other:     ["consulting", "management", "support", "custom", "service"],
};

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono','Fira Mono',monospace" };
const RED = "#ff2b4e";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(price: number, neg: boolean): string {
  if (price === 0) return "Contact";
  return `${price} SOL${neg ? " +" : ""}`;
}

function fmtAge(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000)    return "just now";
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function avgRating(reviews: ListingReview[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? "#eab308" : "#27272a" }}>★</span>
      ))}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryPill({ cat, active, onClick }: { cat: typeof CATEGORIES[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
        borderRadius: 20, border: active ? `1px solid ${RED}` : "1px solid #27272a",
        background: active ? `${RED}15` : "transparent",
        color: active ? RED : "#71717a", fontSize: 11, cursor: "pointer",
        whiteSpace: "nowrap", transition: "all .15s", ...MONO,
      }}
    >
      <span>{cat.emoji}</span>
      <span>{cat.label}</span>
    </button>
  );
}

function ListingCard({ l, onClick, isMine }: { l: Listing; onClick: () => void; isMine: boolean }) {
  const color = CAT_COLOR[l.category];
  const avg = avgRating(l.reviews);
  return (
    <div
      onClick={onClick}
      style={{
        background: "#0a0a0c", border: "1px solid #18181c",
        borderLeft: `3px solid ${color}`,
        borderRadius: 10, padding: "14px 16px", cursor: "pointer",
        transition: "border-color .15s, background .15s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#0e0e12")}
      onMouseLeave={e => (e.currentTarget.style.background = "#0a0a0c")}
    >
      {isMine && (
        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, color: RED, ...MONO, border: `1px solid ${RED}30`, padding: "2px 6px", borderRadius: 4 }}>
          YOURS
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{l.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f7", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color, background: `${color}15`, border: `1px solid ${color}30`, padding: "2px 7px", borderRadius: 10, ...MONO }}>
              {l.category.toUpperCase()}
            </span>
            <span style={{ fontSize: 9, color: "#52525b", ...MONO }}>{l.sellerAlias || l.seller.slice(0,8)+"…"}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: l.price === 0 ? "#52525b" : "#f5f5f7", ...MONO }}>
            {fmtPrice(l.price, l.priceNegotiable)}
          </div>
          <div style={{ fontSize: 9, color: "#52525b", ...MONO }}>⏱ {l.deliveryTime}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#71717a", lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {l.description}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {l.reviews.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Stars rating={avg} />
            <span style={{ fontSize: 9, color: "#52525b", ...MONO }}>({l.reviews.length})</span>
          </div>
        )}
        <span style={{ fontSize: 9, color: "#3f3f46", ...MONO, marginLeft: "auto" }}>
          👁 {l.views} · {fmtAge(l.createdAt)}
        </span>
      </div>
      {l.tags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
          {l.tags.slice(0,5).map(t => (
            <span key={t} style={{ fontSize: 9, color: "#52525b", background: "#18181c", padding: "2px 7px", borderRadius: 8, ...MONO }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create Form ───────────────────────────────────────────────────────────────

function CreateForm({ wallet, walletAlias, onCreated, onCancel, isMobile }: {
  wallet: string; walletAlias: string; onCreated: (l: Listing) => void; onCancel: () => void; isMobile: boolean;
}) {
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [category, setCategory]         = useState<ListingCategory>("launch");
  const [price, setPrice]               = useState("");
  const [priceNeg, setPriceNeg]         = useState(false);
  const [delivery, setDelivery]         = useState("24h");
  const [contactMethod, setContactMethod] = useState<"telegram"|"discord"|"dm">("telegram");
  const [contactHandle, setContactHandle] = useState("");
  const [emoji, setEmoji]               = useState("🚀");
  const [tags, setTags]                 = useState<string[]>([]);
  const [tagInput, setTagInput]         = useState("");
  const [showEmoji, setShowEmoji]       = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  async function submit() {
    if (!wallet) return setError("Connect wallet first");
    if (title.trim().length < 5) return setError("Title must be at least 5 characters");
    if (description.trim().length < 20) return setError("Description must be at least 20 characters");

    setLoading(true); setError("");
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller: wallet, sellerAlias: walletAlias,
          title: title.trim(), description: description.trim(),
          category, price: parseFloat(price) || 0,
          priceNegotiable: priceNeg, deliveryTime: delivery,
          contactMethod, contactHandle: contactHandle.trim() || undefined,
          emoji, tags: tags.slice(0, 8),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      onCreated(data.listing);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/^#/, "").slice(0, 20);
    if (!t) return;
    setTags(prev => (prev.includes(t) || prev.length >= 8) ? prev : [...prev, t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t));
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0a0a0c", border: "1px solid #27272a", borderRadius: 8,
    color: "#f5f5f7", padding: "9px 12px", fontSize: 12, outline: "none", ...MONO,
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 10, color: "#52525b", marginBottom: 4, display: "block", ...MONO };

  return (
    <div style={{ padding: isMobile ? "16px 14px" : "24px", maxWidth: 640, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f5f5f7" }}>New Listing</h2>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {/* Emoji + Title */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flexShrink: 0 }}>
            <label style={labelStyle}>Emoji</label>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowEmoji(v => !v)}
                style={{ width: 42, height: 38, background: "#0a0a0c", border: "1px solid #27272a", borderRadius: 8, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {emoji}
              </button>
              {showEmoji && (
                <div style={{ position: "absolute", top: 44, left: 0, background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: 10, zIndex: 50, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, width: 140 }}>
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => { setEmoji(e); setShowEmoji(false); }}
                      style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 4, borderRadius: 6, transition: "background .1s" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = "#18181c")}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "none")}
                    >{e}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Full Token Launch Package" style={inputStyle} maxLength={80} />
          </div>
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.filter(c => c.id !== "all").map(c => (
              <button key={c.id} onClick={() => setCategory(c.id as ListingCategory)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                  border: category === c.id ? `1px solid ${CAT_COLOR[c.id as ListingCategory]}` : "1px solid #27272a",
                  background: category === c.id ? `${CAT_COLOR[c.id as ListingCategory]}15` : "transparent",
                  color: category === c.id ? CAT_COLOR[c.id as ListingCategory] : "#71717a", ...MONO,
                }}
              >{c.emoji} {c.label}</button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description * ({description.length}/1000)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe what you offer in detail..."
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            maxLength={1000}
          />
        </div>

        {/* Price + Delivery */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Price (SOL) — 0 = Contact</label>
            <input value={price} onChange={e => setPrice(e.target.value)} type="number" min={0} max={100} step={0.01} placeholder="0.5" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Delivery Time</label>
            <select value={delivery} onChange={e => setDelivery(e.target.value)}
              style={{ ...inputStyle, appearance: "none" }}
            >
              {DELIVERY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div
            onClick={() => setPriceNeg(v => !v)}
            style={{
              width: 36, height: 20, borderRadius: 10, background: priceNeg ? RED : "#27272a",
              position: "relative", transition: "background .2s", cursor: "pointer",
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: priceNeg ? 18 : 3, width: 14, height: 14,
              borderRadius: "50%", background: "#f5f5f7", transition: "left .2s",
            }} />
          </div>
          <span style={{ fontSize: 11, color: "#71717a", ...MONO }}>Price negotiable</span>
        </label>

        {/* Contact */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Contact Method</label>
            <select value={contactMethod} onChange={e => setContactMethod(e.target.value as "telegram"|"discord"|"dm")}
              style={{ ...inputStyle, appearance: "none" }}
            >
              {CONTACT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          {contactMethod !== "dm" && (
            <div>
              <label style={labelStyle}>Handle</label>
              <input value={contactHandle} onChange={e => setContactHandle(e.target.value)} placeholder={contactMethod === "telegram" ? "@handle" : "user#1234"} style={inputStyle} maxLength={50} />
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Tags ({tags.length}/8)</label>

          {/* Selected tags as chips */}
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {tags.map(t => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: RED, background: `${RED}15`, border: `1px solid ${RED}40`, padding: "3px 8px", borderRadius: 10, ...MONO }}>
                  #{t}
                  <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {/* Input — Enter to add */}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
              else if (e.key === "Backspace" && !tagInput && tags.length) { removeTag(tags[tags.length - 1]); }
            }}
            onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
            placeholder={tags.length >= 8 ? "Max 8 tags" : "Type a tag, press Enter…"}
            disabled={tags.length >= 8}
            style={inputStyle}
            maxLength={20}
          />

          {/* Recommended tags */}
          {(() => {
            const suggestions = RECOMMENDED_TAGS[category].filter(t => !tags.includes(t));
            if (!suggestions.length || tags.length >= 8) return null;
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: "#3f3f46", marginBottom: 5, ...MONO }}>RECOMMENDED</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {suggestions.map(t => (
                    <button key={t} onClick={() => addTag(t)}
                      style={{ fontSize: 11, color: "#71717a", background: "transparent", border: "1px solid #27272a", padding: "3px 9px", borderRadius: 10, cursor: "pointer", ...MONO, transition: "all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${RED}60`; e.currentTarget.style.color = RED; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#27272a"; e.currentTarget.style.color = "#71717a"; }}
                    >+ {t}</button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {error && (
          <div style={{ background: `${RED}15`, border: `1px solid ${RED}40`, borderRadius: 8, padding: "10px 14px", fontSize: 11, color: RED, ...MONO }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #27272a", background: "none", color: "#71717a", fontSize: 12, cursor: "pointer", ...MONO }}
          >
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: loading ? "#27272a" : RED, color: loading ? "#52525b" : "#fff", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", ...MONO, transition: "background .15s" }}
          >
            {loading ? "Creating…" : "Post Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail View ───────────────────────────────────────────────────────────────

function ListingDetail({ listing: initial, wallet, walletAlias, onBack, onDeleted, isMobile }: {
  listing: Listing; wallet: string; walletAlias: string; onBack: () => void; onDeleted: () => void; isMobile: boolean;
}) {
  const [listing, setListing] = useState(initial);
  const [reviewRating, setReviewRating]   = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError]     = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const isMine = !!(wallet && listing.seller === wallet);
  const alreadyReviewed = listing.reviews.some(r => r.reviewer === wallet);
  const color = CAT_COLOR[listing.category];
  const avg = avgRating(listing.reviews);

  async function submitReview() {
    if (!wallet) return setReviewError("Connect wallet first");
    if (!reviewComment.trim()) return setReviewError("Comment required");
    setReviewLoading(true); setReviewError("");
    try {
      const res = await fetch(`/api/marketplace/${listing.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: wallet, reviewerAlias: walletAlias, rating: reviewRating, comment: reviewComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setReviewError(data.error ?? "Failed"); return; }
      const fresh = await fetch(`/api/marketplace/${listing.id}`);
      const fd = await fresh.json();
      if (fd.listing) setListing(fd.listing);
      setShowReviewForm(false); setReviewComment("");
    } catch { setReviewError("Network error"); }
    finally { setReviewLoading(false); }
  }

  async function cancelListing() {
    if (!wallet) return;
    setCancelLoading(true);
    try {
      await fetch(`/api/marketplace/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, status: "cancelled" }),
      });
      onDeleted();
    } catch { /* ignore */ }
    finally { setCancelLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0a0a0c", border: "1px solid #27272a", borderRadius: 8,
    color: "#f5f5f7", padding: "9px 12px", fontSize: 12, outline: "none", ...MONO, boxSizing: "border-box",
  };

  return (
    <div style={{ padding: isMobile ? "16px 14px" : "24px", maxWidth: 680, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1, marginBottom: 16 }}>← Back</button>

      <div style={{ background: `linear-gradient(135deg, ${color}0e 0%, #000 80%)`, border: `1px solid ${color}30`, borderRadius: 12, padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>{listing.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color, background: `${color}15`, border: `1px solid ${color}30`, padding: "2px 8px", borderRadius: 10, ...MONO }}>
                {listing.category.toUpperCase()}
              </span>
              {listing.status !== "active" && (
                <span style={{ fontSize: 9, color: "#52525b", background: "#18181c", padding: "2px 8px", borderRadius: 10, ...MONO }}>
                  {listing.status.toUpperCase()}
                </span>
              )}
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: isMobile ? 16 : 20, fontWeight: 700, color: "#f5f5f7", lineHeight: 1.3 }}>{listing.title}</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#52525b", ...MONO }}>by {listing.sellerAlias || listing.seller.slice(0,8)+"…"}</span>
              <span style={{ fontSize: 10, color: "#52525b", ...MONO }}>👁 {listing.views} views</span>
              <span style={{ fontSize: 10, color: "#52525b", ...MONO }}>{fmtAge(listing.createdAt)}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: listing.price === 0 ? "#52525b" : "#f5f5f7", ...MONO }}>
              {fmtPrice(listing.price, listing.priceNegotiable)}
            </div>
            <div style={{ fontSize: 10, color: "#52525b", ...MONO, marginTop: 2 }}>⏱ {listing.deliveryTime}</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#0a0a0c", border: "1px solid #18181c", borderRadius: 10, padding: "16px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#52525b", marginBottom: 8, ...MONO }}>DESCRIPTION</div>
        <p style={{ margin: 0, fontSize: 13, color: "#a1a1aa", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{listing.description}</p>
      </div>

      {listing.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {listing.tags.map(t => (
            <span key={t} style={{ fontSize: 10, color: "#52525b", background: "#0a0a0c", border: "1px solid #18181c", padding: "3px 10px", borderRadius: 10, ...MONO }}>#{t}</span>
          ))}
        </div>
      )}

      {listing.status === "active" && !isMine && (
        <div style={{ background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#52525b", marginBottom: 8, ...MONO }}>CONTACT SELLER</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22 }}>
              {listing.contactMethod === "telegram" ? "✈️" : listing.contactMethod === "discord" ? "🎮" : "💬"}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#f5f5f7", fontWeight: 600 }}>
                {listing.contactMethod.charAt(0).toUpperCase() + listing.contactMethod.slice(1)}
                {listing.contactHandle && ` — ${listing.contactHandle}`}
              </div>
              <div style={{ fontSize: 10, color: "#52525b", ...MONO }}>
                {listing.contactMethod === "dm" ? "Send a DM to the seller's wallet address" : `Reach out via ${listing.contactMethod}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {isMine && listing.status === "active" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => {
            if (confirm("Mark this listing as sold?")) {
              fetch(`/api/marketplace/${listing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet, status: "sold" }) })
                .then(() => onDeleted());
            }
          }}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #10b98150", background: "#10b98110", color: "#10b981", fontSize: 11, cursor: "pointer", ...MONO }}
          >
            Mark as Sold
          </button>
          <button onClick={cancelListing} disabled={cancelLoading}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${RED}40`, background: `${RED}10`, color: RED, fontSize: 11, cursor: cancelLoading ? "not-allowed" : "pointer", ...MONO }}
          >
            {cancelLoading ? "Cancelling…" : "Cancel Listing"}
          </button>
        </div>
      )}

      <div style={{ background: "#0a0a0c", border: "1px solid #18181c", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#52525b", ...MONO }}>REVIEWS</span>
            {listing.reviews.length > 0 && (
              <>
                <Stars rating={avg} />
                <span style={{ fontSize: 10, color: "#52525b", ...MONO }}>{avg.toFixed(1)} ({listing.reviews.length})</span>
              </>
            )}
          </div>
          {wallet && !isMine && !alreadyReviewed && listing.status === "active" && (
            <button onClick={() => setShowReviewForm(v => !v)}
              style={{ fontSize: 10, color: RED, background: "none", border: `1px solid ${RED}40`, padding: "4px 10px", borderRadius: 6, cursor: "pointer", ...MONO }}
            >
              + Review
            </button>
          )}
        </div>

        {showReviewForm && (
          <div style={{ background: "#0d0d10", border: "1px solid #27272a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setReviewRating(s)}
                  style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: s <= reviewRating ? "#eab308" : "#27272a", padding: 0 }}
                >★</button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
              placeholder="Share your experience..."
              style={{ width: "100%", background: "#0a0a0c", border: "1px solid #27272a", borderRadius: 8, color: "#f5f5f7", padding: "8px 12px", fontSize: 11, outline: "none", resize: "vertical", minHeight: 70, ...MONO, boxSizing: "border-box" }}
              maxLength={300}
            />
            {reviewError && <div style={{ fontSize: 10, color: RED, marginTop: 4, ...MONO }}>{reviewError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowReviewForm(false)}
                style={{ flex: 1, padding: "7px", borderRadius: 6, border: "1px solid #27272a", background: "none", color: "#52525b", fontSize: 11, cursor: "pointer", ...MONO }}
              >Cancel</button>
              <button onClick={submitReview} disabled={reviewLoading}
                style={{ flex: 2, padding: "7px", borderRadius: 6, border: "none", background: reviewLoading ? "#27272a" : RED, color: reviewLoading ? "#52525b" : "#fff", fontSize: 11, cursor: reviewLoading ? "not-allowed" : "pointer", ...MONO }}
              >
                {reviewLoading ? "Posting…" : "Post Review"}
              </button>
            </div>
          </div>
        )}

        {listing.reviews.length === 0 && (
          <div style={{ fontSize: 11, color: "#3f3f46", textAlign: "center", padding: "16px 0", ...MONO }}>No reviews yet</div>
        )}
        {listing.reviews.map(r => (
          <div key={r.id} style={{ borderTop: "1px solid #18181c", paddingTop: 10, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Stars rating={r.rating} size={11} />
              <span style={{ fontSize: 10, color: "#52525b", ...MONO }}>{r.reviewerAlias || r.reviewer.slice(0,8)+"…"}</span>
              <span style={{ fontSize: 9, color: "#3f3f46", ...MONO, marginLeft: "auto" }}>{fmtAge(r.createdAt)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>{r.comment}</p>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: "#3f3f46", textAlign: "center", ...MONO, paddingBottom: 16 }}>
        All transactions are off-chain — verify sellers before payment. GEASS is not responsible for disputes.
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function MarketplaceTab({ wallet, walletAlias = "", isMobile }: Props) {
  const [listings, setListings]         = useState<Listing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [activeCategory, setActiveCategory] = useState<ListingCategory | "all">("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [view, setView]                 = useState<View>("list");
  const searchTimeout                   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadListings = useCallback(async (cat?: string, q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat && cat !== "all") params.set("category", cat);
      if (q) params.set("search", q);
      const res = await fetch(`/api/marketplace?${params}`);
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadListings(activeCategory, search); }, [activeCategory]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadListings(activeCategory, search), 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  function openListing(l: Listing) {
    setSelectedListing(l);
    setView("detail");
  }

  const listContent = (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 14px" : "16px 20px" }}>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#3f3f46", fontSize: 11, ...MONO }}>
          Loading listings…
        </div>
      ) : listings.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8 }}>
          <div style={{ fontSize: 32 }}>📦</div>
          <div style={{ fontSize: 12, color: "#52525b", ...MONO }}>No listings found</div>
          {wallet && <button onClick={() => setView("create")} style={{ fontSize: 11, color: RED, background: "none", border: `1px solid ${RED}40`, padding: "6px 14px", borderRadius: 8, cursor: "pointer", marginTop: 4, ...MONO }}>Post the first listing</button>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
          {listings.map(l => (
            <ListingCard key={l.id} l={l} onClick={() => openListing(l)} isMine={wallet === l.seller} />
          ))}
        </div>
      )}
    </div>
  );

  if (view === "create") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <CreateForm
          wallet={wallet} walletAlias={walletAlias}
          onCreated={l => { setListings(prev => [l, ...prev]); setSelectedListing(l); setView("detail"); }}
          onCancel={() => setView("list")}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (view === "detail" && selectedListing) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <ListingDetail
          listing={selectedListing}
          wallet={wallet} walletAlias={walletAlias}
          onBack={() => { setView("list"); setSelectedListing(null); }}
          onDeleted={() => { setView("list"); setSelectedListing(null); loadListings(activeCategory, search); }}
          isMobile={isMobile}
        />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: isMobile ? "12px 14px 8px" : "14px 20px 10px", borderBottom: "1px solid #18181c", background: "#050507", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#52525b", fontSize: 13 }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search listings…"
              style={{ width: "100%", background: "#0a0a0c", border: "1px solid #27272a", borderRadius: 8, color: "#f5f5f7", padding: "8px 12px 8px 32px", fontSize: 12, outline: "none", ...MONO, boxSizing: "border-box" }}
            />
          </div>
          {wallet && (
            <button onClick={() => setView("create")}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: RED, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", ...MONO }}
            >
              + List
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {CATEGORIES.map(c => (
            <CategoryPill key={c.id} cat={c} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id as ListingCategory | "all")} />
          ))}
        </div>
      </div>

      {listContent}
    </div>
  );
}
