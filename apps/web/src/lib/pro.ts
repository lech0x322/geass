"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { proCheckout, proVerify, type ProStatus } from "./api";
import { signAndSendBytes } from "./wallet";
import { type PlanId, PLAN_BY_ID, hasAccess } from "./plans";

const STORAGE_PREFIX = "geass_pro_";
const storeKey = (wallet: string) => `${STORAGE_PREFIX}${wallet}`;

interface StoredPro {
  signature: string;
  paidAt: number;
  expiresAt: number;
  tier: PlanId;
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
  tier: PlanId | "creator";
  isCreator: boolean;
  expiresAt: number | null;
  signature: string | null;
  loading: boolean;
  error: string;
  pay: (plan: PlanId) => Promise<void>;
  refresh: () => Promise<void>;
  can: (required: PlanId) => boolean;
}

export function useProStatus(wallet: string | null): ProState {
  const [isCreator, setIsCreator] = useState(false);
  const [active, setActive] = useState(false);
  const [tier, setTier] = useState<PlanId | "creator">("scout");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const stored = loadStored(wallet);
    if (!stored) {
      setActive(false); setExpiresAt(null); setSignature(null); setTier("scout");
      return;
    }
    setLoading(true);
    try {
      const r = await proVerify(stored.signature, wallet);
      if (r.active && r.expiresAt) {
        const t = r.tier ?? stored.tier ?? "millioner";
        setActive(true); setTier(t); setExpiresAt(r.expiresAt);
        setSignature(r.signature || stored.signature);
        saveStored(wallet, { signature: r.signature || stored.signature, paidAt: r.paidAt ?? stored.paidAt, expiresAt: r.expiresAt, tier: t });
      } else {
        setActive(false); setTier("scout");
        setExpiresAt(stored.expiresAt); setSignature(stored.signature);
        if (r.error) setError(r.error);
        if (stored.expiresAt < Date.now()) clearStored(wallet);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [wallet]);

  useEffect(() => {
    if (!wallet) return;
    fetch(`/api/profile?wallet=${encodeURIComponent(wallet)}`)
      .then(r => r.json())
      .then((d: { profile: { isCreator: boolean } | null }) => {
        if (d.profile?.isCreator) { setIsCreator(true); setActive(true); setTier("creator"); }
      })
      .catch(() => {});
  }, [wallet]);

  useEffect(() => { refresh(); }, [refresh]);

  const pay = useCallback(async (plan: PlanId) => {
    if (!wallet) throw new Error("No wallet");
    const planDef = PLAN_BY_ID[plan];
    if (!planDef || planDef.priceSol === 0) throw new Error("Invalid plan");
    setLoading(true); setError("");
    try {
      const storedRef = typeof window !== "undefined" ? (localStorage.getItem("geass_ref") ?? undefined) : undefined;
      const checkout = await proCheckout(plan, storedRef);
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

      let verified: ProStatus | null = null;
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 2_500));
        try {
          const v = await proVerify(sig, wallet);
          if (v.active && v.expiresAt) { verified = v; break; }
          if (v.error && !v.error.includes("not found") && !v.error.includes("not yet")) throw new Error(v.error);
        } catch (e) { if (i === 11) throw e; }
      }
      if (!verified || !verified.expiresAt) throw new Error("Payment sent but not confirmed on-chain yet. Click 'Refresh status' in a moment.");

      const t = verified.tier ?? plan;
      saveStored(wallet, { signature: sig, paidAt: verified.paidAt ?? Date.now(), expiresAt: verified.expiresAt, tier: t });
      setActive(true); setTier(t); setExpiresAt(verified.expiresAt); setSignature(sig);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally { setLoading(false); }
  }, [wallet]);

  const can = useCallback((required: PlanId) => {
    if (isCreator) return true;
    return hasAccess(tier, required);
  }, [tier, isCreator]);

  return { active, tier, isCreator, expiresAt, signature, loading, error, pay, refresh, can };
}
