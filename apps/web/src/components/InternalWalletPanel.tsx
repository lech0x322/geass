"use client";

import { useState, useRef } from "react";
import { Keypair } from "@solana/web3.js";
import type { UseInternalWallet } from "@/lib/useInternalWallet";
import { IconLock, IconCheck, IconX, IconRefresh, IconPower, IconWallet, IconArrowUpRight } from "./icons";

interface Props {
  iw: UseInternalWallet;
}

type Screen = "menu" | "create-show" | "create-password" | "import" | "unlock" | "manage";

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1, background: "#09090b", border: "1px solid #27272a", borderRadius: 8, padding: "8px 10px", fontSize: 10, color: "#a1a1aa", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all", lineHeight: 1.6 }}>
          {value}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ padding: "0 10px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: copied ? "#10b981" : "#52525b", cursor: "pointer", fontSize: 10, flexShrink: 0 }}>
          {copied ? <IconCheck size={12} /> : "Copy"}
        </button>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Password"}
        style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5", padding: "9px 36px 9px 12px", fontSize: 11, outline: "none", boxSizing: "border-box" }}
      />
      <button onClick={() => setShow(v => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 10 }}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function InternalWalletPanel({ iw }: Props) {
  const [screen, setScreen] = useState<Screen>(
    iw.status === "none" ? "menu" : iw.status === "locked" ? "unlock" : "manage",
  );
  const [err, setErr]       = useState("");
  const [busy, setBusy]     = useState(false);
  const [pw, setPw]         = useState("");
  const [pw2, setPw2]       = useState("");
  const [importKey, setImportKey] = useState("");
  const pendingKp = useRef<Keypair | null>(null);
  const [privKeyPreview, setPrivKeyPreview] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showPrivKey, setShowPrivKey] = useState(false);

  const go = (s: Screen) => { setErr(""); setPw(""); setPw2(""); setConfirmed(false); setScreen(s); };

  async function doCreate() {
    const { keypair, privateKeyB58 } = iw.create();
    pendingKp.current = keypair;
    setPrivKeyPreview(privateKeyB58);
    go("create-show");
  }

  async function doSave() {
    setErr("");
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    if (!confirmed) { setErr("Please confirm you have saved your private key."); return; }
    if (!pendingKp.current) return;
    setBusy(true);
    try {
      await iw.save(pendingKp.current, pw);
      setPrivKeyPreview("");
      go("manage");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error saving wallet");
    } finally { setBusy(false); }
  }

  async function doUnlock() {
    setErr("");
    if (!pw) { setErr("Enter your password."); return; }
    setBusy(true);
    try {
      await iw.unlock(pw);
      go("manage");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Wrong password");
    } finally { setBusy(false); }
  }

  async function doImport() {
    setErr("");
    if (!importKey.trim()) { setErr("Paste your private key."); return; }
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    setBusy(true);
    try {
      await iw.importKey(importKey.trim(), pw);
      setImportKey("");
      go("manage");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid private key");
    } finally { setBusy(false); }
  }

  const body = () => {
    if (screen === "menu") return (
      <div>
        <p style={{ fontSize: 11, color: "#71717a", marginBottom: 24, lineHeight: 1.6 }}>
          Create a dedicated trading wallet for fast autosnipe transactions. Your private key is encrypted locally — GEASS never sees it.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={doCreate}
            style={{ padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: ".5px" }}>
            Create New Trading Wallet
          </button>
          <button onClick={() => go("import")}
            style={{ padding: "11px", borderRadius: 10, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Import Existing Private Key
          </button>
        </div>
      </div>
    );

    if (screen === "create-show") return (
      <div>
        <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b40", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 10, color: "#f59e0b", lineHeight: 1.6 }}>
          <strong>Back up your private key now.</strong> This is the only way to recover your wallet. GEASS does not store it anywhere.
          If you lose this key and forget your password, your funds are permanently inaccessible.
        </div>
        <Field label="ADDRESS" value={pendingKp.current?.publicKey.toBase58() ?? ""} mono />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 5 }}>PRIVATE KEY (base58)</div>
          <div style={{ position: "relative" }}>
            <div style={{ background: "#09090b", border: "1px solid #ef444440", borderRadius: 8, padding: "8px 10px", fontSize: 10, color: showPrivKey ? "#f4f4f5" : "transparent", textShadow: showPrivKey ? "none" : "0 0 8px #f4f4f5", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6, userSelect: showPrivKey ? "auto" : "none" }}>
              {privKeyPreview}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button onClick={() => setShowPrivKey(v => !v)}
                style={{ flex: 1, padding: "6px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 10, cursor: "pointer" }}>
                {showPrivKey ? "Hide" : "Reveal"}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(privKeyPreview); }}
                style={{ flex: 1, padding: "6px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 10, cursor: "pointer" }}>
                Copy
              </button>
            </div>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#a1a1aa", marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          I have saved my private key in a safe place
        </label>
        <button onClick={() => go("create-password")} disabled={!confirmed}
          style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", background: confirmed ? "linear-gradient(135deg,#dc2626,#7c3aed)" : "#27272a", color: confirmed ? "#fff" : "#52525b", fontSize: 11, fontWeight: 700, cursor: confirmed ? "pointer" : "default" }}>
          Continue → Set Password
        </button>
      </div>
    );

    if (screen === "create-password") return (
      <div>
        <p style={{ fontSize: 11, color: "#71717a", marginBottom: 16, lineHeight: 1.6 }}>Set a password to encrypt your private key in this browser.</p>
        <PasswordInput value={pw} onChange={setPw} placeholder="New password (min 8 chars)" />
        <PasswordInput value={pw2} onChange={setPw2} placeholder="Confirm password" />
        {err && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 10 }}>{err}</div>}
        <button onClick={doSave} disabled={busy}
          style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Encrypting…" : "Encrypt & Save Wallet"}
        </button>
      </div>
    );

    if (screen === "import") return (
      <div>
        <p style={{ fontSize: 11, color: "#71717a", marginBottom: 14, lineHeight: 1.6 }}>
          Paste your 64-byte base58 Solana private key (same format as Phantom's "Export Private Key").
        </p>
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={importKey}
            onChange={e => setImportKey(e.target.value)}
            placeholder="Paste private key here…"
            rows={3}
            style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5", padding: "9px 12px", fontSize: 10, outline: "none", resize: "none", fontFamily: "monospace", boxSizing: "border-box" }}
          />
        </div>
        <PasswordInput value={pw} onChange={setPw} placeholder="New password (min 8 chars)" />
        <PasswordInput value={pw2} onChange={setPw2} placeholder="Confirm password" />
        {err && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => go("menu")}
            style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid #27272a", background: "transparent", color: "#52525b", fontSize: 11, cursor: "pointer" }}>
            Back
          </button>
          <button onClick={doImport} disabled={busy}
            style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>
            {busy ? "Importing…" : "Import & Encrypt"}
          </button>
        </div>
      </div>
    );

    if (screen === "unlock") return (
      <div>
        <p style={{ fontSize: 11, color: "#71717a", marginBottom: 14, lineHeight: 1.6 }}>
          Wallet found: <span style={{ fontFamily: "monospace", color: "#a1a1aa" }}>{iw.publicKey?.slice(0, 20)}…</span>
          <br />Enter your password to unlock it for this session.
        </p>
        <PasswordInput value={pw} onChange={setPw} placeholder="Password" />
        {err && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 10 }}>{err}</div>}
        <button onClick={doUnlock} disabled={busy}
          style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Decrypting…" : "Unlock Wallet"}
        </button>
        <button onClick={() => { if (confirm("Delete wallet? This cannot be undone.")) { iw.destroy(); setScreen("menu"); } }}
          style={{ width: "100%", marginTop: 8, padding: "8px", borderRadius: 9, border: "1px solid #ef444430", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>
          Delete Wallet
        </button>
      </div>
    );

    if (screen === "manage") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>Wallet Unlocked</span>
        </div>

        <Field label="ADDRESS" value={iw.publicKey ?? ""} mono />

        <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 4 }}>BALANCE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#f4f4f5" }}>
              {iw.balance !== null ? `${iw.balance.toFixed(4)} SOL` : "—"}
            </span>
            <button onClick={iw.refreshBalance}
              style={{ background: "transparent", border: "1px solid #27272a", color: "#52525b", borderRadius: 6, cursor: "pointer", padding: "3px 6px", display: "flex" }}>
              <IconRefresh size={11} />
            </button>
          </div>
          <div style={{ fontSize: 9, color: "#3f3f46", marginTop: 4 }}>Fund this wallet by sending SOL from Phantom or any exchange</div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <a href={`https://solscan.io/account/${iw.publicKey}`} target="_blank" rel="noopener noreferrer"
            style={{ padding: "8px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 10, fontWeight: 600, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <IconArrowUpRight size={11} /> Solscan
          </a>
          <button onClick={iw.lock}
            style={{ padding: "8px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#f59e0b", fontSize: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <IconLock size={11} /> Lock
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { if (confirm("This will permanently delete your trading wallet from this browser. Make sure you have your private key backed up.")) { iw.destroy(); setScreen("menu"); } }}
            style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #ef444430", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>
            Delete Wallet
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 14, padding: "20px 18px" }}>
      <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        <IconWallet size={11} />
        {screen === "manage" ? "TRADING WALLET" : screen === "unlock" ? "UNLOCK TRADING WALLET" : "SETUP TRADING WALLET"}
      </div>
      {body()}
    </div>
  );
}
