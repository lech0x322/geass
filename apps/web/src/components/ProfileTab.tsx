"use client";

import React, { useState, useEffect, useCallback } from "react";
import { IconUser, IconWallet, IconActivity, IconCopy, IconCheck, IconRefresh, IconArrowUpRight, IconCrown, IconChart, IconVerified, IconCamera } from "./icons";
import JupiterSwapModal from "./JupiterSwapModal";

const CARD: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #1e1e21",
  borderRadius: 14,
  padding: "18px 16px",
};

const LABEL: React.CSSProperties = {
  fontSize: 9,
  color: "#52525b",
  letterSpacing: "1.2px",
  fontWeight: 700,
  marginBottom: 6,
};

const EMOJIS = ["🧠", "🦊", "🐉", "🌑", "⚡", "🎯", "💎", "🔥", "🏹", "🐋", "🦁", "🌙", "🚀", "👾", "🤖"];

interface ActivityTx {
  sig: string;
  ts: number;
  type: string;
  desc: string;
  fee: number;
  source: string;
  nativeAmt: number;
}

interface Props {
  wallet: string;
  solBalance: string | null;
  solPrice: number | null;
  isPro: boolean;
  isMobile: boolean;
}

export function ProfileTab({ wallet, solBalance, solPrice, isPro, isMobile }: Props) {
  const [copied, setCopied]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [username, setUsername] = useState("Anon Trader");
  const [emoji, setEmoji]       = useState("🧠");
  const [avatar, setAvatar]     = useState<string | null>(null);
  const [draftName, setDraftName] = useState("Anon Trader");
  const [draftEmoji, setDraftEmoji] = useState("🧠");

  const uploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setAvatar(b64);
      try {
        const raw = localStorage.getItem("geass_profile");
        const p = raw ? JSON.parse(raw) : {};
        localStorage.setItem("geass_profile", JSON.stringify({ ...p, avatar: b64 }));
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const [activity, setActivity]     = useState<ActivityTx[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [actLoaded, setActLoaded]   = useState(false);
  const [jupModal, setJupModal]     = useState<{ mint: string; symbol: string; mode: "buy" | "sell" } | null>(null);
  const [swapMint, setSwapMint]     = useState("");
  const [swapMode, setSwapMode]     = useState<"buy" | "sell">("buy");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("geass_profile");
      if (raw) {
        const p = JSON.parse(raw) as { username?: string; emoji?: string; avatar?: string };
        if (p.username) { setUsername(p.username); setDraftName(p.username); }
        if (p.emoji)    { setEmoji(p.emoji); setDraftEmoji(p.emoji); }
        if (p.avatar)   { setAvatar(p.avatar); }
      }
    } catch {}
  }, []);

  const saveProfile = () => {
    const n = draftName.trim() || "Anon Trader";
    setUsername(n);
    setEmoji(draftEmoji);
    try { localStorage.setItem("geass_profile", JSON.stringify({ username: n, emoji: draftEmoji })); } catch {}
    setEditing(false);
  };

  const copyWallet = () => {
    navigator.clipboard.writeText(wallet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadActivity = useCallback(async () => {
    setActLoading(true);
    try {
      const r = await fetch(`/api/wallet/activity?wallet=${wallet}`);
      const d = await r.json() as { txs: ActivityTx[] };
      setActivity(d.txs ?? []);
    } catch {
      setActivity([]);
    } finally {
      setActLoading(false);
      setActLoaded(true);
    }
  }, [wallet]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const solNum  = solBalance ? parseFloat(solBalance) : null;
  const solUsd  = solNum != null && solPrice ? solNum * solPrice : null;
  const shortWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  const fmtAge = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Profile card */}
      <div style={{ ...CARD, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: isPro ? "linear-gradient(90deg,#10b981,#7c3aed)" : "linear-gradient(90deg,#ef4444,#f97316)" }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            {avatar ? (
              <img src={avatar} alt="avatar" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #27272a" }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1a1a1e", border: "2px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                {emoji}
              </div>
            )}
            <label title="Upload photo" style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: "50%", background: "#27272a", border: "1px solid #3f3f46", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <IconCamera size={10} style={{ color: "#a1a1aa" }} />
              <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
            </label>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>{username}</span>
              {isPro && <IconVerified size={18} />}
              {isPro && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, color: "#a855f7", background: "#a855f720", border: "1px solid #a855f740", padding: "2px 7px", borderRadius: 8 }}>
                  <IconCrown size={9} /> PRO
                </span>
              )}
            </div>
            <button onClick={copyWallet}
              style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "monospace", color: "#71717a", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              {shortWallet}
              {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
            </button>
          </div>

          <button onClick={() => { setDraftName(username); setDraftEmoji(emoji); setEditing(!editing); }}
            style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 10, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={LABEL}>USERNAME</div>
              <input
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                maxLength={24}
                placeholder="Anon Trader"
                style={{ width: "100%", background: "#0c0c0e", border: "1px solid #27272a", borderRadius: 8, padding: "8px 12px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <div style={LABEL}>AVATAR</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setDraftEmoji(e)}
                    style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${draftEmoji === e ? "#ef4444" : "#27272a"}`, background: draftEmoji === e ? "#ef444420" : "transparent", fontSize: 18, cursor: "pointer" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={saveProfile}
              style={{ alignSelf: "flex-start", padding: "8px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Save Profile
            </button>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10 }}>
        <div style={CARD}>
          <div style={LABEL}><IconWallet size={9} style={{ marginRight: 4 }} />SOL BALANCE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f4f4f5", lineHeight: 1.2 }}>
            {solNum != null ? solNum.toFixed(4) : "—"}
          </div>
          <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>
            {solUsd != null ? `≈ $${solUsd.toFixed(2)}` : "—"}
          </div>
        </div>

        <div style={CARD}>
          <div style={LABEL}><IconChart size={9} style={{ marginRight: 4 }} />STATUS</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: isPro ? "#10b981" : "#52525b" }}>{isPro ? "PRO" : "FREE"}</div>
          <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>{isPro ? "All features unlocked" : "Upgrade for full access"}</div>
        </div>

        {!isMobile && (
          <div style={CARD}>
            <div style={LABEL}><IconUser size={9} style={{ marginRight: 4 }} />ADDRESS</div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#71717a", wordBreak: "break-all", lineHeight: 1.4 }}>{wallet}</div>
          </div>
        )}
      </div>

      {/* Top-up */}
      <div style={{ ...CARD, background: "#0d1117", border: "1px solid #1e3a2f" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>Top Up Wallet</div>
          <IconWallet size={14} style={{ color: "#10b981" }} />
        </div>
        <div style={{ fontSize: 11, color: "#52525b", marginBottom: 14, lineHeight: 1.6 }}>
          Send SOL to your connected wallet address to fund trading operations.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0c0c0e", border: "1px solid #27272a", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: "#a1a1aa", wordBreak: "break-all" }}>{wallet}</span>
          <button onClick={copyWallet}
            style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: copied ? "#10b981" : "#71717a", fontSize: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            {copied ? <><IconCheck size={10} /> Copied</> : <><IconCopy size={10} /> Copy</>}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="https://jup.ag/swap/USDC-SOL" target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #10b98140", background: "#10b98110", color: "#10b981", fontSize: 11, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            Buy SOL on Jupiter <IconArrowUpRight size={10} />
          </a>
          <a href={`https://solscan.io/account/${wallet}`} target="_blank" rel="noopener noreferrer"
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 11, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            Solscan <IconArrowUpRight size={10} />
          </a>
        </div>
      </div>

      {/* Jupiter Quick Swap */}
      {jupModal && (
        <JupiterSwapModal
          wallet={wallet}
          mint={jupModal.mint}
          symbol={jupModal.symbol}
          mode={jupModal.mode}
          onClose={() => setJupModal(null)}
        />
      )}
      <div style={{ ...CARD, border: "1px solid #a855f730" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>Quick Swap</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["buy", "sell"] as const).map(m => (
              <button key={m} onClick={() => setSwapMode(m)}
                style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: swapMode === m ? "#a855f7" : "#27272a", background: swapMode === m ? "#a855f720" : "transparent", color: swapMode === m ? "#a855f7" : "#52525b" }}>
                {m === "buy" ? "Buy" : "Sell"}
              </button>
            ))}
          </div>
        </div>
        <input
          value={swapMint}
          onChange={e => setSwapMint(e.target.value.trim())}
          placeholder="Token mint address…"
          style={{ width: "100%", background: "#0c0c0e", border: "1px solid #27272a", borderRadius: 8, padding: "8px 12px", color: "#f4f4f5", fontSize: 11, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
        />
        <button
          disabled={swapMint.length < 32}
          onClick={() => setJupModal({ mint: swapMint, symbol: swapMint.slice(0, 6), mode: swapMode })}
          style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: swapMint.length >= 32 ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "#1e1e21", color: swapMint.length >= 32 ? "#fff" : "#52525b", fontSize: 12, fontWeight: 700, cursor: swapMint.length >= 32 ? "pointer" : "not-allowed" }}>
          Open Swap
        </button>
      </div>

      {/* Activity */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
            <IconActivity size={13} /> Recent Activity
          </div>
          <button onClick={loadActivity} disabled={actLoading}
            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <IconRefresh size={10} className={actLoading ? "spin" : undefined} />
            {actLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {actLoading && activity.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#3f3f46", fontSize: 11 }} className="pulse">Fetching transactions…</div>
        )}

        {actLoaded && activity.length === 0 && !actLoading && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#3f3f46", fontSize: 11 }}>No recent transactions found</div>
        )}

        {activity.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {activity.map(tx => {
              const isIn  = tx.nativeAmt > 0;
              const isOut = tx.nativeAmt < 0;
              const dot   = tx.type === "SWAP" ? "#a855f7" : isIn ? "#10b981" : "#ef4444";
              return (
                <div key={tx.sig} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 8, background: "#0c0c0e" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.desc || tx.type}
                    </div>
                    <div style={{ fontSize: 9, color: "#52525b", marginTop: 1 }}>{fmtAge(tx.ts)} · fee: {tx.fee.toFixed(6)} SOL</div>
                  </div>
                  {tx.nativeAmt !== 0 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: isIn ? "#10b981" : "#ef4444", flexShrink: 0 }}>
                      {isOut ? "" : "+"}{tx.nativeAmt.toFixed(3)} SOL
                    </div>
                  )}
                  <a href={`https://solscan.io/tx/${tx.sig}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3f3f46", flexShrink: 0 }}>
                    <IconArrowUpRight size={11} />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
