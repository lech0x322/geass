"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { proCheckout, proVerify, type ProStatus } from "./api";
import { signAndSendBytes } from "./wallet";

const STORAGE_PREFIX = "geass_pro_";
const storeKey = (wallet: string) => `${STORAGE_PREFIX}${wallet}`;

interface StoredPro {
  signature: string;
  paidAt: number;
  expiresAt: number;
}

function loadStored(wallet: string): StoredPro | null {
  try {
    const raw = localStorage.getItem(storeKey(wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPro;
    if (!parsed?.signature || !parsed?.expiresAt) return null;
    return parsed;
  } catch { return null; }
}

function saveStored(wallet: string, s: StoredPro) {
  try { localStorage.setItem(storeKey(wallet), JSON.stringify(s)); } catch { /* noop */ }
}

function clearStored(wallet: string) {
  try { localStorage.removeItem(storeKey(wallet)); } catch { /* noop */ }
}

export interface ProState {
  active: boolean;
  expiresAt: number | null;
  signature: string | null;
  loading: boolean;
  error: string;
  pay: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProStatus(wallet: string | null): ProState {
  const [active, setActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Re-verify a stored signature with the backend (defends against stale localStorage).
  const refresh = useCallback(async () => {
    if (!wallet) return;
    const stored = loadStored(wallet);
    if (!stored) {
      setActive(false); setExpiresAt(null); setSignature(null);
      return;
    }
    setLoading(true);
    try {
      const r = await proVerify(stored.signature, wallet);
      if (r.active && r.expiresAt) {
        setActive(true);
        setExpiresAt(r.expiresAt);
        setSignature(r.signature || stored.signature);
        saveStored(wallet, { signature: r.signature || stored.signature, paidAt: r.paidAt ?? stored.paidAt, expiresAt: r.expiresAt });
      } else {
        setActive(false);
        setExpiresAt(stored.expiresAt);
        setSignature(stored.signature);
        if (r.error) setError(r.error);
        if (stored.expiresAt < Date.now()) clearStored(wallet);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { refresh(); }, [refresh]);

  const pay = useCallback(async () => {
    if (!wallet) throw new Error("No wallet");
    setLoading(true); setError("");
    try {
      const checkout = await proCheckout();
      const tx = new Transaction({
        feePayer: new PublicKey(wallet),
        blockhash: checkout.blockhash,
        lastValidBlockHeight: checkout.lastValidBlockHeight,
      });
      tx.add(SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet),
        toPubkey: new PublicKey(checkout.treasury),
        lamports: Math.floor(checkout.amountSol * LAMPORTS_PER_SOL),
      }));
      const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

      // Open SSE BEFORE sending the tx so the Helius webhook can't race us.
      // When the webhook reports a matching transfer, we verify immediately.
      const es = typeof EventSource !== "undefined" ? new EventSource(`/api/pro/listen?wallet=${wallet}`) : null;
      const webhookHit = new Promise<void>((resolve) => {
        if (!es) return; // never resolves; falls back to polling
        es.addEventListener("payment", () => resolve());
      });

      let sig: string;
      try {
        sig = await signAndSendBytes(bytes);
      } catch (e) {
        es?.close();
        throw e;
      }

      // Race the webhook against a 30s ceiling that triggers polling fallback.
      await Promise.race([webhookHit, new Promise(r => setTimeout(r, 30_000))]);
      es?.close();

      // Try a single fast verify (webhook fired → Helius has indexed it).
      let verified: ProStatus | null = null;
      try {
        const v = await proVerify(sig, wallet);
        if (v.active && v.expiresAt) verified = v;
      } catch { /* fall through to polling */ }

      // Fallback polling if webhook didn't fire or indexer lagged.
      if (!verified) {
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 2_500));
          try {
            const v = await proVerify(sig, wallet);
            if (v.active && v.expiresAt) { verified = v; break; }
            if (v.error && !v.error.includes("not found") && !v.error.includes("not yet")) {
              throw new Error(v.error);
            }
          } catch (e) {
            if (i === 7) throw e;
          }
        }
      }
      if (!verified || !verified.expiresAt) {
        throw new Error("Payment sent but not confirmed on-chain yet. Click 'Refresh status' in a moment.");
      }
      saveStored(wallet, {
        signature: sig,
        paidAt: verified.paidAt ?? Date.now(),
        expiresAt: verified.expiresAt,
      });
      setActive(true);
      setExpiresAt(verified.expiresAt);
      setSignature(sig);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  return { active, expiresAt, signature, loading, error, pay, refresh };
}
