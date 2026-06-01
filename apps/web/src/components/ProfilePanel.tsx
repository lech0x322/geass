"use client";

import React, { useState, useEffect, useRef } from "react";
import { IconWallet, IconCopy, IconCheck, IconArrowUpRight, IconUser, IconVerified, IconCreatorBadge, IconCamera } from "./icons";
import { resizeAvatar, getCachedAvatar, setCachedAvatar, fetchAvatar, uploadAvatar } from "@/lib/avatar";

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
  // Saved values — two-name system synced with ProfileTab
  const [handle, setHandle]           = useState("");            // unique @username
  const [displayName, setDisplayName] = useState("Anon Trader"); // public name, not unique
  const [emoji, setEmoji]             = useState("🧠");
  const [avatar, setAvatar]           = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [editing, setEditing]         = useState(false);
  // Draft values
  const [draftHandle, setDraftHandle]           = useState("");
  const [draftDisplayName, setDraftDisplayName] = useState("Anon Trader");
  const [draftEmoji, setDraftEmoji]             = useState("🧠");
  const [handleAvail, setHandleAvail] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [saveError, setSaveError]     = useState("");
  const [saving, setSaving]           = useState(false);
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Avatar: paint cached copy instantly, then sync from server across devices
  useEffect(() => {
    if (!wallet) return;
    const cached = getCachedAvatar(wallet);
    if (cached) setAvatar(cached);
    fetchAvatar(wallet).then(remote => {
      if (remote) { setAvatar(remote); setCachedAvatar(wallet, remote); }
    });
  }, [wallet]);

  // Load profile from server — syncs across all devices
  useEffect(() => {
    if (!wallet) return;
    fetch(`/api/profile?wallet=${encodeURIComponent(wallet)}`)
      .then(r => r.json())
      .then((d: { profile: { username: string; displayName?: string; emoji: string } | null }) => {
        if (d.profile) {
          setHandle(d.profile.username);   setDraftHandle(d.profile.username);
          const dn = d.profile.displayName ?? d.profile.username;
          setDisplayName(dn);              setDraftDisplayName(dn);
          setEmoji(d.profile.emoji);       setDraftEmoji(d.profile.emoji);
        }
      })
      .catch(() => {});
  }, [wallet]);

  // Check handle availability with debounce
  useEffect(() => {
    if (!editing) return;
    const clean = draftHandle.trim().toLowerCase();
    if (clean === handle.toLowerCase() || clean.length < 2) { setHandleAvail("idle"); return; }
    setHandleAvail("checking");
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current);
    handleCheckTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/profile/check-handle?handle=${encodeURIComponent(clean)}&wallet=${encodeURIComponent(wallet)}`);
        const d = await r.json() as { available: boolean };
        setHandleAvail(d.available ? "ok" : "taken");
      } catch { setHandleAvail("idle"); }
    }, 500);
  }, [draftHandle, editing, handle, wallet]);

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeAvatar(file);
      setAvatar(dataUrl);
      setCachedAvatar(wallet, dataUrl);
      await uploadAvatar(wallet, dataUrl);  // syncs to all devices
    } catch { /* keep local copy even if upload fails */ }
  };

  const save = async () => {
    if (handleAvail === "taken") { setSaveError("Username already taken"); return; }
    const h  = draftHandle.trim().toLowerCase();
    const dn = draftDisplayName.trim() || h;
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, username: h, displayName: dn, emoji: draftEmoji }),
      });
      const data = await res.json() as { profile?: { username: string; displayName: string; emoji: string; isCreator: boolean }; error?: string };
      if (!res.ok) { setSaveError(data.error ?? "Failed to save"); return; }
      if (data.profile) {
        setHandle(data.profile.username);
        setDisplayName(data.profile.displayName);
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

  const handleHint  = handleAvail === "checking" ? "checking…" : handleAvail === "ok" ? "available ✓" : handleAvail === "taken" ? "taken ✕" : "";
  const handleColor = handleAvail === "ok" ? "#10b981" : handleAvail === "taken" ? "#ef4444" : "#52525b";

  return (
    <aside style={{ width: 240, background: "#0c0c0e", borderLeft: "1px solid #18181b", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 14px", borderBottom: "1px solid #18181b", gap: 8, flexShrink: 0 }}>
        <IconUser size={13} style={{ color: "#52525b" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#52525b", letterSpacing: "1px" }}>PROFILE</span>
        <button onClick={() => { setDraftHandle(handle); setDraftDisplayName(displayName); setDraftEmoji(emoji); setEditing(v => !v); setHandleAvail("idle"); setSaveError(""); }}
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
              <input type="file" accept="image/*" onChange={onAvatarFile} style={{ display: "none" }} />
            </label>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName || "Anon Trader"}</span>
              {isCreator
                ? <IconCreatorBadge size={15} style={{ flexShrink: 0, filter: "drop-shadow(0 0 4px #f59e0b80)" }} />
                : effectivelyPro
                  ? <IconVerified size={14} />
                  : null
              }
            </div>
            {handle && (
              <div style={{ fontSize: 9, color: "#5a5a63", fontFamily: "monospace", marginTop: 1 }}>@{handle}</div>
            )}
            <button onClick={copy}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontFamily: "monospace", color: "#52525b", background: "transparent", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
              {wallet.slice(0, 6)}…{wallet.slice(-4)}
              {copied ? <IconCheck size={9} /> : <IconCopy size={9} />}
            </button>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9, background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: "10px" }}>
            {/* Display name — non-unique */}
            <div>
              <div style={{ fontSize: 8, color: "#52525b", letterSpacing: ".5px", marginBottom: 4 }}>DISPLAY NAME</div>
              <input value={draftDisplayName} onChange={e => setDraftDisplayName(e.target.value)} maxLength={32} placeholder="Anon Trader"
                style={{ background: "#0c0c0e", border: "1px solid #27272a", borderRadius: 6, padding: "6px 10px", color: "#f4f4f5", fontSize: 11, outline: "none", width: "100%", boxSizing: "border-box" }} />
            </div>
            {/* Handle — unique */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 8, color: "#52525b", letterSpacing: ".5px" }}>USERNAME (UNIQUE)</span>
                {handleHint && <span style={{ fontSize: 8, color: handleColor, fontWeight: 700 }}>{handleHint}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", background: "#0c0c0e", border: `1px solid ${handleColor === "#52525b" ? "#27272a" : handleColor}`, borderRadius: 6, transition: "border-color .15s" }}>
                <span style={{ padding: "6px 4px 6px 10px", fontSize: 11, color: "#52525b", fontFamily: "monospace", userSelect: "none" }}>@</span>
                <input value={draftHandle} onChange={e => setDraftHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} placeholder="yourhandle"
                  style={{ flex: 1, background: "transparent", border: "none", padding: "6px 10px 6px 0", color: "#f4f4f5", fontSize: 11, outline: "none", fontFamily: "monospace" }} />
              </div>
            </div>
            {/* Emoji */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setDraftEmoji(e)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${draftEmoji === e ? "#ef4444" : "#27272a"}`, background: draftEmoji === e ? "#ef444420" : "transparent", fontSize: 14, cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
            {saveError && <div style={{ fontSize: 10, color: "#ef4444" }}>{saveError}</div>}
            <button onClick={save} disabled={saving || handleAvail === "taken" || handleAvail === "checking"}
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
