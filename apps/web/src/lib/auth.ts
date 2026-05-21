"use client";
import { useState, useEffect, useCallback } from "react";
import { signInWithSolana, getPhantom } from "./wallet";
import { fetchBalance } from "./api";

export function useWalletAuth() {
  const [wallet, setWallet]   = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Restore session from HttpOnly JWT cookie
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(({ address }: { address: string | null }) => {
        if (!address) return;
        setWallet(address);
        fetchBalance(address).then(sol => { if (sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
      })
      .catch(() => {
        // Fallback: try silent Phantom reconnect (no popup)
        try {
          const p = getPhantom();
          if (p) {
            p.connect({ onlyIfTrusted: true })
              .then(r => {
                const addr = r.publicKey.toString();
                setWallet(addr);
                fetchBalance(addr).then(sol => { if (sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
              })
              .catch(() => {});
          }
        } catch { /* SSR guard */ }
      });
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
