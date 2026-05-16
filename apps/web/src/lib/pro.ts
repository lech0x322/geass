"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { proCheckout, proVerify, type ProStatus } from "./api";
import { signAndSendBytes } from "./wallet";

const STORAGE_PREFIX = "geass_pro_";
const PENDING_PREFIX = "geass_pro_pending_";
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

const storeKey   = (wallet: string) => `${STORAGE_PREFIX}${wallet}`;
const pendingKey = (wallet: string) => `${PENDING_PREFIX}${wallet}`;

interface StoredPro { signature: string; paidAt: number; expiresAt: number; }
interface PendingPay { signature: string; sentAt: number; }

function safeGet<T>(k: string): T | null {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
}
function safeSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ } }
function safeDel(k: string) { try { localStorage.removeItem(k); } catch { /* noop */ } }

export interface ProState {
  active: boolean;
  expiresAt: number | null;
  signature: string | null;
  pendingSig: string | null;     // Tx broadcast, awaiting on-chain confirmation
  pendingSince: number | null;
  loading: boolean;
  verifying: boolean;            // True while refresh() polls a pending sig
  error: string;
  pay: () => Promise<void>;
  refresh: () => Promise<void>;
  clearPending: () => void;
}

export function useProStatus(wallet: string | null): ProState {
  const [active, setActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [pendingSig, setPendingSig] = useState<string | null>(null);
  const [pendingSince, setPendingSince] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  /**
   * Attempts to confirm a known signature. Returns the verified status on
   * success, null otherwise. Never throws — callers handle null.
   */
  const tryVerify = useCallback(async (sig: string, w: string): Promise<ProStatus | null> => {
    try {
      const v = await proVerify(sig, w);
      return v.active && v.expiresAt ? v : null;
    } catch { return null; }
  }, []);

  /**
   * Reconciles state with storage + chain. Promotes pending → active when the
   * tx finally indexes; clears expired Pro entries.
   */
  const refresh = useCallback(async () => {
    if (!wallet) return;
    setError("");

    const stored = safeGet<StoredPro>(storeKey(wallet));
    const pending = safeGet<PendingPay>(pendingKey(wallet));

    // Re-verify confirmed Pro (defends against tampered localStorage).
    if (stored) {
      setVerifying(true);
      const v = await tryVerify(stored.signature, wallet);
      setVerifying(false);
      if (v && v.expiresAt) {
        setActive(true);
        setExpiresAt(v.expiresAt);
        setSignature(v.signature || stored.signature);
        safeSet(storeKey(wallet), { signature: stored.signature, paidAt: v.paidAt ?? stored.paidAt, expiresAt: v.expiresAt });
      } else {
        setActive(false);
        setExpiresAt(stored.expiresAt);
        setSignature(stored.signature);
        if (stored.expiresAt < Date.now()) safeDel(storeKey(wallet));
      }
    } else {
      setActive(false); setExpiresAt(null); setSignature(null);
    }

    // Check for a pending payment and try to promote it.
    if (pending && Date.now() - pending.sentAt < PENDING_MAX_AGE_MS) {
      setPendingSig(pending.signature);
      setPendingSince(pending.sentAt);
      setVerifying(true);
      const v = await tryVerify(pending.signature, wallet);
      setVerifying(false);
      if (v && v.expiresAt) {
        safeSet(storeKey(wallet), { signature: pending.signature, paidAt: v.paidAt ?? Date.now(), expiresAt: v.expiresAt });
        safeDel(pendingKey(wallet));
        setActive(true);
        setExpiresAt(v.expiresAt);
        setSignature(pending.signature);
        setPendingSig(null);
        setPendingSince(null);
      }
    } else if (pending) {
      // Pending expired — discard.
      safeDel(pendingKey(wallet));
      setPendingSig(null);
      setPendingSince(null);
    } else {
      setPendingSig(null);
      setPendingSince(null);
    }
  }, [wallet, tryVerify]);

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

      // Open SSE before signing so the Helius webhook can short-circuit polling.
      const es = typeof EventSource !== "undefined" ? new EventSource(`/api/pro/listen?wallet=${wallet}`) : null;
      let webhookFired = false;
      es?.addEventListener("payment", () => { webhookFired = true; });

      let sig: string;
      try {
        sig = await signAndSendBytes(bytes);
      } catch (e) {
        es?.close();
        throw e;
      }

      // Persist the signature IMMEDIATELY so a tab reload / late indexer
      // doesn't lose the payment. refresh() will promote it once confirmed.
      safeSet(pendingKey(wallet), { signature: sig, sentAt: Date.now() } satisfies PendingPay);
      setPendingSig(sig);
      setPendingSince(Date.now());

      // Poll every 2s for up to 90s. If the webhook fires mid-wait, the next
      // poll picks it up immediately.
      const MAX_ATTEMPTS = 45;
      let verified: ProStatus | null = null;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, webhookFired ? 200 : 2_000));
        const v = await tryVerify(sig, wallet);
        if (v && v.expiresAt) { verified = v; break; }
        // If the webhook fired but the very next verify lost the race, give
        // it one quick extra attempt before going back to the slow interval.
        if (webhookFired && !v) {
          await new Promise(r => setTimeout(r, 800));
          const v2 = await tryVerify(sig, wallet);
          if (v2 && v2.expiresAt) { verified = v2; break; }
        }
      }
      es?.close();

      if (!verified || !verified.expiresAt) {
        // Don't error out — the tx is on-chain, it just hasn't been indexed
        // by Helius yet. Leave it as pending; the user can hit "Verify now"
        // or come back later and refresh() will promote it.
        setError(`Payment broadcast — waiting for the indexer to catch up. We saved your signature; use "Verify now" in a moment.`);
        return;
      }

      // Promote pending → confirmed.
      safeSet(storeKey(wallet), {
        signature: sig,
        paidAt: verified.paidAt ?? Date.now(),
        expiresAt: verified.expiresAt,
      } satisfies StoredPro);
      safeDel(pendingKey(wallet));
      setActive(true);
      setExpiresAt(verified.expiresAt);
      setSignature(sig);
      setPendingSig(null);
      setPendingSince(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [wallet, tryVerify]);

  const clearPending = useCallback(() => {
    if (!wallet) return;
    safeDel(pendingKey(wallet));
    setPendingSig(null);
    setPendingSince(null);
    setError("");
  }, [wallet]);

  return { active, expiresAt, signature, pendingSig, pendingSince, loading, verifying, error, pay, refresh, clearPending };
}
