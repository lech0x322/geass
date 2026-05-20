"use client";
import { useState, useEffect, useCallback } from "react";
import { connectPhantom, getPhantom } from "./wallet";
import { fetchBalance } from "./api";

const STORAGE_KEY = "geass_wallet";

export function useWalletAuth() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWallet(stored);
        fetchBalance(stored).then(sol => { if (sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
        return;
      }
      // Try silent reconnect if Phantom already trusts this site
      const p = getPhantom();
      if (p) {
        p.connect({ onlyIfTrusted: true })
          .then(r => {
            const addr = r.publicKey.toString();
            setWallet(addr);
            localStorage.setItem(STORAGE_KEY, addr);
            fetchBalance(addr).then(sol => { if (sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
          })
          .catch(() => { /* not yet trusted — user must click connect */ });
      }
    } catch { /* SSR guard */ }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const addr = await connectPhantom();
      // Set wallet immediately so the app transitions right away
      setWallet(addr);
      localStorage.setItem(STORAGE_KEY, addr);
      // Fetch balance in the background — don't block or fail connect on it
      fetchBalance(addr).then(sol => { if (sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
    } catch (e) {
      console.warn("wallet connect:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setBalance(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  return { wallet, balance, loading, connect, disconnect };
}
