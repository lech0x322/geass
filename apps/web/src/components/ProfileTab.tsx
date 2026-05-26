"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PublicKey, Transaction, SystemProgram, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { IconUser, IconWallet, IconActivity, IconCopy, IconCheck, IconRefresh, IconArrowUpRight, IconCrown, IconChart, IconVerified, IconCamera } from "./icons";
import JupiterSwapModal from "./JupiterSwapModal";
import type { UseInternalWallet } from "@/lib/useInternalWallet";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";

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
  iw: UseInternalWallet;
}

export function ProfileTab({ wallet, solBalance, solPrice, isPro, isMobile, iw }: Props) {
  const [copied, setCopied]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [username, setUsername] = useState("Anon Trader");
  const [emoji, setEmoji]       = useState("🧠");
  const [avatar, setAvatar]     = useState<string | null>(null);
  const [draftName, setDraftName] = useState("Anon Trader");
  const [draftEmoji, setDraftEmoji] = useState("🧠");

  // Transfer state
  const [txSource, setTxSource]   = useState<"phantom" | "internal">("phantom");
  const [txTo, setTxTo]           = useState("");
  const [txAmt, setTxAmt]         = useState("");
  const [txMsg, setTxMsg]         = useState("");
  const [txBusy, setTxBusy]       = useState(false);

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

  const [pumpProfile, setPumpProfile] = useState<{ username?: string; bio?: string; profile_image?: string } | null>(null);
  const [pumpCoins, setPumpCoins]     = useState<{ mint: string; name: string; symbol: string; image_uri?: string; market_cap?: number }[]>([]);
  const [pumpLoading, setPumpLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    setPumpLoading(true);
    fetch(`/api/pump/profile?wallet=${wallet}`)
      .then(r => r.json())
      .then((d: { profile: { username?: string; bio?: string; profile_image?: string } | null; coins: { mint: string; name: string; symbol: string; image_uri?: string; market_cap?: number }[] }) => {
        setPumpProfile(d.profile ?? null);
        setPumpCoins(d.coins ?? []);
      })
      .catch(() => {})
      .finally(() => setPumpLoading(false));
  }, [wallet]);

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

      {/* Transfer */}
      <div style={{ ...CARD, border: "1px solid #3b82f630" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
          <IconArrowUpRight size={14} /> Transfer SOL
        </div>

        {/* Source selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {(["phantom", "internal"] as const).map(src => {
            const label = src === "phantom" ? "Phantom Wallet" : "Trading Wallet";
            const locked = src === "internal" && iw.status !== "unlocked";
            const active = txSource === src;
            return (
              <button key={src} onClick={() => { if (!locked) setTxSource(src); }}
                title={locked ? "Unlock your trading wallet first" : undefined}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: `1px solid ${active ? "#3b82f6" : "#27272a"}`, background: active ? "#3b82f615" : "transparent", color: active ? "#3b82f6" : locked ? "#3f3f46" : "#71717a", fontSize: 11, fontWeight: active ? 700 : 500, cursor: locked ? "not-allowed" : "pointer" }}>
                {label}
                {locked && <span style={{ fontSize: 9, marginLeft: 5, color: "#3f3f46" }}>locked</span>}
              </button>
            );
          })}
        </div>

        {/* Own-account quick-send shortcuts */}
        {iw.publicKey && iw.status === "unlocked" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {txSource === "phantom" ? (
              <button onClick={() => setTxTo(iw.publicKey!)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px dashed #27272a", background: "transparent", color: "#52525b", fontSize: 10, cursor: "pointer", textAlign: "left" }}>
                To my Trading Wallet <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{iw.publicKey.slice(0,6)}…{iw.publicKey.slice(-4)}</span>
              </button>
            ) : (
              <button onClick={() => setTxTo(wallet)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px dashed #27272a", background: "transparent", color: "#52525b", fontSize: 10, cursor: "pointer", textAlign: "left" }}>
                To my Phantom Wallet <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{wallet.slice(0,6)}…{wallet.slice(-4)}</span>
              </button>
            )}
          </div>
        )}

        {/* Recipient */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5, fontWeight: 700 }}>RECIPIENT ADDRESS</div>
          <input value={txTo} onChange={e => setTxTo(e.target.value)} placeholder="Solana wallet address…"
            style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5", padding: "9px 12px", fontSize: 11, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5, fontWeight: 700 }}>AMOUNT (SOL)</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" value={txAmt} onChange={e => setTxAmt(e.target.value)} placeholder="0.00" min="0" step="0.001"
              style={{ flex: 1, background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5", padding: "9px 12px", fontSize: 11, outline: "none" }} />
            {txSource === "phantom" && solBalance && (
              <button onClick={() => setTxAmt(Math.max(0, parseFloat(solBalance) - 0.001).toFixed(4))}
                style={{ padding: "0 12px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 10, cursor: "pointer" }}>Max</button>
            )}
            {txSource === "internal" && iw.balance !== null && (
              <button onClick={() => setTxAmt(Math.max(0, iw.balance! - 0.001).toFixed(4))}
                style={{ padding: "0 12px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 10, cursor: "pointer" }}>Max</button>
            )}
          </div>
          <div style={{ fontSize: 9, color: "#3f3f46", marginTop: 4 }}>
            {txSource === "phantom" && solBalance && <>Phantom balance: {parseFloat(solBalance).toFixed(4)} SOL</>}
            {txSource === "internal" && iw.balance !== null && <>Trading wallet: {iw.balance.toFixed(4)} SOL</>}
          </div>
        </div>

        {txMsg && (
          <div style={{ fontSize: 10, padding: "8px 12px", borderRadius: 8, background: txMsg.startsWith("✅") ? "#10b98110" : "#ef444410", border: `1px solid ${txMsg.startsWith("✅") ? "#10b98130" : "#ef444430"}`, color: txMsg.startsWith("✅") ? "#10b981" : "#ef4444", marginBottom: 12, wordBreak: "break-all" }}>
            {txMsg}
          </div>
        )}

        <button disabled={txBusy} onClick={async () => {
          setTxMsg("");
          const amt = parseFloat(txAmt);
          if (!txTo.trim()) { setTxMsg("Enter a recipient address."); return; }
          if (!amt || amt <= 0) { setTxMsg("Enter a valid amount."); return; }
          setTxBusy(true);
          try {
            if (txSource === "internal") {
              const sig = await iw.sendSol(txTo.trim(), amt);
              setTxMsg("✅ Sent! " + sig.slice(0, 20) + "…");
              iw.refreshBalance();
            } else {
              const ph = (window as { solana?: { signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> } }).solana;
              if (!ph) throw new Error("Phantom not found");
              const conn = new Connection(RPC, "confirmed");
              const { blockhash } = await conn.getLatestBlockhash("confirmed");
              const tx = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(wallet) });
              tx.add(SystemProgram.transfer({ fromPubkey: new PublicKey(wallet), toPubkey: new PublicKey(txTo.trim()), lamports: Math.round(amt * LAMPORTS_PER_SOL) }));
              const { signature } = await ph.signAndSendTransaction(tx);
              setTxMsg("✅ Sent! " + signature.slice(0, 20) + "…");
            }
            setTxTo(""); setTxAmt("");
          } catch (e) {
            setTxMsg("❌ " + (e instanceof Error ? e.message : String(e)));
          } finally { setTxBusy(false); }
        }}
          style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: txBusy ? "#27272a" : "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: txBusy ? "#52525b" : "#fff", fontSize: 12, fontWeight: 700, cursor: txBusy ? "wait" : "pointer" }}>
          {txBusy ? "Sending…" : "Send"}
        </button>
      </div>

      {/* Pump.fun Profile Sync */}
      <div style={{ ...CARD, border: "1px solid #10b98130", background: "#0b1510" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <img src="https://pump.fun/favicon.ico" alt="pump.fun" width={14} height={14} style={{ borderRadius: 3 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>Pump.fun Profile</span>
          </div>
          {pumpLoading && <span style={{ fontSize: 9, color: "#52525b" }} className="pulse">Syncing…</span>}
        </div>

        {!pumpLoading && !pumpProfile && pumpCoins.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "#3f3f46" }}>
            No pump.fun activity found for this wallet
          </div>
        )}

        {pumpProfile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px", background: "#0c0c0e", borderRadius: 10 }}>
            {pumpProfile.profile_image ? (
              <img src={pumpProfile.profile_image} alt="pump avatar" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #10b98130" }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#10b98115", border: "1px solid #10b98130", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎪</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>{pumpProfile.username ?? "Anonymous"}</div>
              {pumpProfile.bio && <div style={{ fontSize: 10, color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pumpProfile.bio}</div>}
            </div>
            <a href={`https://pump.fun/profile/${wallet}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 9, color: "#10b981", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              View <IconArrowUpRight size={9} />
            </a>
          </div>
        )}

        {pumpCoins.length > 0 && (
          <>
            <div style={LABEL}>TOKENS LAUNCHED ({pumpCoins.length})</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
              {pumpCoins.map(c => (
                <a key={c.mint} href={`https://pump.fun/${c.mint}`} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", background: "#0c0c0e", border: "1px solid #1e1e21", borderRadius: 8, padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {c.image_uri ? (
                    <img src={c.image_uri} alt={c.symbol} width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#10b98120", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🪙</div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#f4f4f5", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>${c.symbol}</div>
                  {c.market_cap != null && (
                    <div style={{ fontSize: 8, color: "#52525b" }}>{c.market_cap >= 1e6 ? `$${(c.market_cap / 1e6).toFixed(1)}M` : c.market_cap >= 1e3 ? `$${(c.market_cap / 1e3).toFixed(0)}K` : `$${c.market_cap}`}</div>
                  )}
                </a>
              ))}
            </div>
          </>
        )}
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
