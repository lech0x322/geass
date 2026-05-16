"use client";
import { useState, useEffect, useCallback } from "react";
import { connectPhantom } from "./wallet";
import { fetchBalance } from "./api";

const STORAGE_KEY = "geass_wallet";

export function useWalletAuth() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setWallet(stored);
    } catch { /* SSR guard */ }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const addr = await connectPhantom();
      setWallet(addr);
      localStorage.setItem(STORAGE_KEY, addr);
      const sol = await fetchBalance(addr);
      if (sol !== null) setBalance(sol.toFixed(3));
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
