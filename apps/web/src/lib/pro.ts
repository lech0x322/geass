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
    if (!parsed?.signature) return null;
    // expiresAt === 0 means "pending — payment sent but not yet indexed"; keep so Refresh can re-verify.
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
      const storedRef = typeof window !== "undefined" ? (localStorage.getItem("geass_ref") ?? undefined) : undefined;
      const checkout = await proCheckout(storedRef);
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
      const sig = await signAndSendBytes(bytes);

      // Persist the signature immediately so `Refresh status` works even if
      // Helius indexing is slow and the poll loop below times out.
      saveStored(wallet, { signature: sig, paidAt: Date.now(), expiresAt: 0 });
      setSignature(sig);

      // Poll verify (Helius needs a moment to index — Solana mainnet can lag 30-60s
      // behind confirmation). 24 × 2.5s = up to 60s, plus a 3s head start.
      let verified: ProStatus | null = null;
      await new Promise(r => setTimeout(r, 3_000));
      for (let i = 0; i < 24; i++) {
        try {
          const v = await proVerify(sig, wallet);
          if (v.active && v.expiresAt) { verified = v; break; }
          if (v.error && !v.error.includes("not found") && !v.error.includes("not yet")) {
            throw new Error(v.error);
          }
        } catch (e) {
          if (i === 23) throw e;
        }
        await new Promise(r => setTimeout(r, 2_500));
      }
      if (!verified || !verified.expiresAt) {
        throw new Error(
          "Payment landed but Helius hasn't indexed it yet (can take up to 2 minutes on a busy network). " +
          "Your signature is saved — click 'Refresh status' in ~30 seconds to confirm.",
        );
      }
      saveStored(wallet, {
        signature: sig,
        paidAt: verified.paidAt ?? Date.now(),
        expiresAt: verified.expiresAt,
      });
      setActive(true);
      setExpiresAt(verified.expiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  return { active, expiresAt, signature, loading, error, pay, refresh };
}
