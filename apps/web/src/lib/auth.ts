"use client";
import { useState, useEffect, useCallback } from "react";
import { signInWithSolana } from "./wallet";
import { fetchBalance } from "./api";

export function useWalletAuth() {
  const [wallet, setWallet]   = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Only restore wallet from a valid SIWS JWT session. Without a verified
    // session, show the landing page so the user signs in via SIWS.
    fetch("/api/auth/session", { cache: "no-store" })
      .then(r => r.json())
      .then(({ address }: { address: string | null }) => {
        if (cancelled || !address) return;
        setWallet(address);
        fetchBalance(address).then(sol => { if (!cancelled && sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
      })
      .catch(() => { /* network error — stay on landing */ });

    return () => { cancelled = true; };
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const addr = await signInWithSolana();
      setWallet(addr);
      fetchBalance(addr).then(sol => { if (sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
    } catch (e) {
      console.warn("wallet connect:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setWallet(null);
    setBalance(null);
    await fetch("/api/auth/verify", { method: "DELETE" }).catch(() => {});
  }, []);

  return { wallet, balance, loading, connect, disconnect };
}
