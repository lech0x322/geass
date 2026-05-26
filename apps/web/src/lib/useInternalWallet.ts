"use client";

import { useState, useCallback, useEffect } from "react";
import { Keypair, PublicKey, Transaction, SystemProgram, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  generateWallet, keypairFromPrivateKey, encryptAndStore,
  decryptStoredWallet, getStoredWalletMeta, clearStoredWallet,
} from "./internalWallet";
import { fetchBalance } from "./api";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";

export type WalletStatus = "none" | "locked" | "unlocked";

export interface UseInternalWallet {
  status: WalletStatus;
  publicKey: string | null;
  balance: number | null;
  /** Call during "create" flow to get the private key to show the user. */
  preview: string | null;
  /** Create a new wallet. Returns the private key for the user to save. */
  create: () => { privateKeyB58: string; keypair: Keypair };
  /** Encrypt + persist the previewed keypair with a password. */
  save: (keypair: Keypair, password: string) => Promise<void>;
  /** Unlock an existing stored wallet. */
  unlock: (password: string) => Promise<void>;
  /** Lock (wipe keypair from memory, keep encrypted storage). */
  lock: () => void;
  /** Import from an existing private key b58 string. */
  importKey: (privateKeyB58: string, password: string) => Promise<void>;
  /** Sign a VersionedTransaction with the internal wallet. */
  sign: (tx: import("@solana/web3.js").VersionedTransaction) => void;
  /** Send SOL to any address. Returns the transaction signature. */
  sendSol: (toAddress: string, amountSol: number) => Promise<string>;
  /** Delete the wallet from storage entirely. */
  destroy: () => void;
  /** Refresh balance. */
  refreshBalance: () => void;
}

export function useInternalWallet(): UseInternalWallet {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [status, setStatus]   = useState<WalletStatus>("none");
  const [balance, setBalance] = useState<number | null>(null);

  // On mount, detect stored wallet.
  useEffect(() => {
    const meta = getStoredWalletMeta();
    setStatus(meta ? "locked" : "none");
  }, []);

  const publicKey = keypair?.publicKey.toBase58() ?? getStoredWalletMeta()?.publicKey ?? null;

  const refreshBalance = useCallback(() => {
    const pk = keypair?.publicKey.toBase58() ?? getStoredWalletMeta()?.publicKey;
    if (!pk) return;
    fetchBalance(pk).then(sol => { if (sol !== null) setBalance(sol); }).catch(() => {});
  }, [keypair]);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);

  const create = useCallback(() => {
    return generateWallet();
  }, []);

  const save = useCallback(async (kp: Keypair, password: string) => {
    await encryptAndStore(kp, password);
    setKeypair(kp);
    setStatus("unlocked");
    fetchBalance(kp.publicKey.toBase58()).then(sol => { if (sol !== null) setBalance(sol); }).catch(() => {});
  }, []);

  const unlock = useCallback(async (password: string) => {
    const kp = await decryptStoredWallet(password);
    setKeypair(kp);
    setStatus("unlocked");
    fetchBalance(kp.publicKey.toBase58()).then(sol => { if (sol !== null) setBalance(sol); }).catch(() => {});
  }, []);

  const lock = useCallback(() => {
    setKeypair(null);
    setStatus("locked");
  }, []);

  const importKey = useCallback(async (privateKeyB58: string, password: string) => {
    const kp = keypairFromPrivateKey(privateKeyB58);
    await encryptAndStore(kp, password);
    setKeypair(kp);
    setStatus("unlocked");
    fetchBalance(kp.publicKey.toBase58()).then(sol => { if (sol !== null) setBalance(sol); }).catch(() => {});
  }, []);

  const sign = useCallback((tx: import("@solana/web3.js").VersionedTransaction) => {
    if (!keypair) throw new Error("Internal wallet is locked");
    tx.sign([keypair]);
  }, [keypair]);

  const sendSol = useCallback(async (toAddress: string, amountSol: number): Promise<string> => {
    if (!keypair) throw new Error("Wallet is locked — unlock it first");
    if (amountSol <= 0) throw new Error("Amount must be greater than 0");
    const toPk = new PublicKey(toAddress);
    const conn = new Connection(RPC, "confirmed");
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: keypair.publicKey });
    tx.add(SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: toPk,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    }));
    tx.sign(keypair);
    const signedTxBase64 = Buffer.from(tx.serialize()).toString("base64");
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedTxBase64 }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.signature as string;
  }, [keypair]);

  const destroy = useCallback(() => {
    clearStoredWallet();
    setKeypair(null);
    setStatus("none");
    setBalance(null);
  }, []);

  return { status, publicKey, balance, preview: null, create, save, unlock, lock, importKey, sign, sendSol, destroy, refreshBalance };
}
