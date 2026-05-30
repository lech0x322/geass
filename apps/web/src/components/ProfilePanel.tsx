"use client";

import React, { useState, useEffect } from "react";
import { IconWallet, IconCopy, IconCheck, IconArrowUpRight, IconCrown, IconUser, IconVerified, IconCamera } from "./icons";

const EMOJIS = ["🧠", "🦊", "🐉", "🌑", "⚡", "🎯", "💎", "🔥", "🏹", "🐋", "🦁", "🌙", "🚀", "👾", "🤖"];

interface Props {
  wallet: string;
  solBalance: string | null;
  solPrice: number | null;
  isPro: boolean;
  isCreator?: boolean;
  onClose?: () => void;
  onProfileSaved?: (username: string, emoji: string, isCreator: boolean) => void;
}

export function ProfilePanel({ wallet, solBalance, solPrice, isPro, isCreator = false, onClose, onProfileSaved }: Props) {
  const [username, setUsername] = useState("Anon Trader");
  const [emoji, setEmoji]       = useState("🧠");
  const [avatar, setAvatar]     = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [draftName, setDraftName]   = useState("Anon Trader");
  const [draftEmoji, setDraftEmoji] = useState("🧠");
  const [saveError, setSaveError]   = useState("");
  const [saving, setSaving]         = useState(false);

  // Avatar stays in localStorage (base64 too large for Redis)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`geass_avatar_${wallet}`);
      if (raw) setAvatar(raw);
    } catch {}
  }, [wallet]);

  // Load username+emoji from server — syncs across all devices
  useEffect(() => {
    if (!wallet) return;
    fetch(`/api/profile?wallet=${encodeURIComponent(wallet)}`)
      .then(r => r.json())
      .then((d: { profile: { username: string; emoji: string; isCreator: boolean } | null }) => {
        if (d.profile) {
          setUsername(d.profile.username);
          setDraftName(d.profile.username);
          setEmoji(d.profile.emoji);
          setDraftEmoji(d.profile.emoji);
        }
      })
      .catch(() => {});
  }, [wallet]);

  const uploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setAvatar(b64);
      try { localStorage.setItem(`geass_avatar_${wallet}`, b64); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const n = draftName.trim() || "Anon Trader";
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, username: n, emoji: draftEmoji }),
      });
      const data = await res.json() as { profile?: { username: string; emoji: string; isCreator: boolean }; error?: string };
      if (!res.ok) { setSaveError(data.error ?? "Failed to save"); return; }
      if (data.profile) {
        setUsername(data.profile.username);
        setEmoji(data.profile.emoji);
        onProfileSaved?.(data.profile.username, data.profile.emoji, data.profile.isCreator);
      }
      setEditing(false);
    } catch { setSaveError("Network error"); }
    finally { setSaving(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(wallet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const solNum = solBalance ? parseFloat(solBalance) : null;
  const solUsd = solNum != null && solPrice ? solNum * solPrice : null;
  const effectivelyPro = isPro || isCreator;

  return (
    <aside style={{ width: 240, background: "#0c0c0e", borderLeft: "1px solid #18181b", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 14px", borderBottom: "1px solid #18181b", gap: 8, flexShrink: 0 }}>
        <IconUser size={13} style={{ color: "#52525b" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#52525b", letterSpacing: "1px" }}>PROFILE</span>
        <button onClick={() => { setDraftName(username); setDraftEmoji(emoji); setEditing(v => !v); setSaveError(""); }}
          style={{ marginLeft: "auto", padding: "3px 9px", borderRadius: 5, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 9, cursor: "pointer" }}>
          {editing ? "Cancel" : "Edit"}
        </button>
        {onClose && (
          <button onClick={onClose} title="Hide panel"
            style={{ padding: "3px 7px", borderRadius: 5, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 12, lineHeight: 1, cursor: "pointer" }}>
            ‹
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
            {avatar ? (
              <img src={avatar} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #27272a" }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1a1a1e", border: "2px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {emoji}
              </div>
            )}
            <label title="Upload photo" style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderRadius: "50%", background: "#27272a", border: "1px solid #3f3f46", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <IconCamera size={8} style={{ color: "#a1a1aa" }} />
              <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
            </label>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{username}</span>
              {effectivelyPro && <IconVerified size={14} />}
              {isCreator
                ? <span style={{ fontSize: 8, color: "#ff2b4e", fontWeight: 700, background: "#ff2b4e18", border: "1px solid #ff2b4e40", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.5px" }}>CREATOR</span>
                : effectivelyPro && <IconCrown size={11} style={{ color: "#a855f7", flexShrink: 0 }} />
              }
            </div>
            <button onClick={copy}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontFamily: "monospace", color: "#52525b", background: "transparent", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
              {wallet.slice(0, 6)}…{wallet.slice(-4)}
              {copied ? <IconCheck size={9} /> : <IconCopy size={9} />}
            </button>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: "10px" }}>
            <input value={draftName} onChange={e => setDraftName(e.target.value)} maxLength={24} placeholder="Username"
              style={{ background: "#0c0c0e", border: "1px solid #27272a", borderRadius: 6, padding: "6px 10px", color: "#f4f4f5", fontSize: 11, outline: "none", width: "100%", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setDraftEmoji(e)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${draftEmoji === e ? "#ef4444" : "#27272a"}`, background: draftEmoji === e ? "#ef444420" : "transparent", fontSize: 14, cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
            {saveError && <div style={{ fontSize: 10, color: "#ef4444" }}>{saveError}</div>}
            <button onClick={save} disabled={saving}
              style={{ padding: "6px", borderRadius: 6, border: "none", background: saving ? "#27272a" : "#ef4444", color: saving ? "#52525b" : "#fff", fontSize: 10, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        {/* Balance */}
        <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1px", marginBottom: 4, display: "flex", alignItems: "center", gap: 3 }}>
            <IconWallet size={8} /> SOL BALANCE
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f5" }}>
            {solNum != null ? solNum.toFixed(4) : "—"}
          </div>
          <div style={{ fontSize: 10, color: "#71717a", marginTop: 1 }}>
            {solUsd != null ? `≈ $${solUsd.toFixed(2)}` : "—"}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: isCreator ? "#ff2b4e0a" : effectivelyPro ? "#0f1f15" : "#111113",
          border: `1px solid ${isCreator ? "#ff2b4e30" : effectivelyPro ? "#10b98130" : "#1e1e21"}`,
          borderRadius: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: isCreator ? "#ff2b4e" : effectivelyPro ? "#10b981" : "#52525b", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: isCreator ? "#ff2b4e" : effectivelyPro ? "#10b981" : "#52525b" }}>
              {isCreator ? "CREATOR" : effectivelyPro ? "PRO ACTIVE" : "FREE"}
            </div>
            <div style={{ fontSize: 9, color: "#3f3f46" }}>
              {isCreator ? "Full access — all features" : effectivelyPro ? "All features unlocked" : "Upgrade for Pro"}
            </div>
          </div>
        </div>

        {/* Top-up */}
        <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 8, color: "#52525b", letterSpacing: "1px", marginBottom: 8 }}>TOP UP WALLET</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#0c0c0e", border: "1px solid #27272a", borderRadius: 6, padding: "5px 8px", marginBottom: 8 }}>
            <span style={{ flex: 1, fontFamily: "monospace", fontSize: 9, color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wallet}</span>
            <button onClick={copy} style={{ flexShrink: 0, background: "transparent", border: "none", color: copied ? "#10b981" : "#52525b", cursor: "pointer", display: "flex" }}>
              {copied ? <IconCheck size={10} /> : <IconCopy size={10} />}
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <a href="https://jup.ag/swap/USDC-SOL" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, padding: "5px 6px", borderRadius: 6, border: "1px solid #10b98140", background: "#10b98110", color: "#10b981", fontSize: 9, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              Buy SOL <IconArrowUpRight size={8} />
            </a>
            <a href={`https://solscan.io/account/${wallet}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 9, textDecoration: "none", display: "flex", alignItems: "center" }}>
              <IconArrowUpRight size={9} />
            </a>
          </div>
        </div>

      </div>
    </aside>
  );
}
