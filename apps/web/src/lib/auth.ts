"use client";
import { useState, useEffect, useCallback } from "react";
import { signInWithSolana, getPhantom } from "./wallet";
import { fetchBalance } from "./api";

export function useWalletAuth() {
  const [wallet, setWallet]   = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const trySilentPhantomReconnect = () => {
      try {
        const p = getPhantom();
        if (!p) return;
        p.connect({ onlyIfTrusted: true })
          .then(r => {
            if (cancelled) return;
            const addr = r.publicKey.toString();
            setWallet(addr);
            fetchBalance(addr).then(sol => { if (!cancelled && sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
          })
          .catch(() => { /* user not trusted yet — expected */ });
      } catch { /* SSR guard */ }
    };

    fetch("/api/auth/session", { cache: "no-store" })
      .then(r => r.json())
      .then(({ address }: { address: string | null }) => {
        if (cancelled) return;
        if (address) {
          setWallet(address);
          fetchBalance(address).then(sol => { if (!cancelled && sol !== null) setBalance(sol.toFixed(3)); }).catch(() => {});
        } else {
          // No JWT session — try silent Phantom reconnect if user previously approved
          trySilentPhantomReconnect();
        }
      })
      .catch(trySilentPhantomReconnect);

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
