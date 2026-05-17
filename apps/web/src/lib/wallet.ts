"use client";

import { toB64 } from "./config";

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signTransaction?: (tx: { serialize: () => Uint8Array }) => Promise<{ serialize: () => Uint8Array }>;
  signAllTransactions?: (txs: { serialize: () => Uint8Array }[]) => Promise<{ serialize: () => Uint8Array }[]>;
  signAndSendTransaction?: (
    tx: { serialize: () => Uint8Array; serializeMessage: () => Uint8Array },
  ) => Promise<{ signature: string }>;
  request?: (args: { method: string; params: unknown }) => Promise<{ signature?: string } | string>;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const p = window.solana;
  return p?.isPhantom ? p : null;
}

export async function connectPhantom(): Promise<string> {
  const p = getPhantom();
  if (!p) {
    window.open("https://phantom.app", "_blank");
    throw new Error("Phantom not installed");
  }
  const r = await p.connect();
  return r.publicKey.toString();
}

export async function signAndSendBytes(bytes: Uint8Array): Promise<string> {
  const p = getPhantom();
  if (!p) throw new Error("Phantom not found");
  if (p.request) {
    try {
      const res = await p.request({
        method: "signAndSendTransaction",
        params: { transaction: toB64(bytes) },
      });
      if (typeof res === "string") return res;
      if (res?.signature) return res.signature;
    } catch {
      // fall through to the deprecated path
    }
  }
  if (p.signAndSendTransaction) {
    const res = await p.signAndSendTransaction({
      serialize: () => bytes,
      serializeMessage: () => bytes,
    });
    return res.signature;
  }
  throw new Error("Phantom signing API unavailable");
}

/**
 * Sign multiple transactions with Phantom in a single user approval.
 * Used for Jito bundle submissions where we need multiple signed txs.
 * Returns base64-encoded serialized signed transactions.
 */
export async function signAllWithPhantom(txBytes: Uint8Array[]): Promise<string[]> {
  const p = getPhantom();
  if (!p) throw new Error("Phantom not found");

  const fakeTxs = txBytes.map(bytes => ({
    serialize: () => bytes,
    serializeMessage: () => bytes,
  }));

  if (p.signAllTransactions) {
    const signed = await p.signAllTransactions(fakeTxs);
    return signed.map(tx => Buffer.from(tx.serialize()).toString("base64"));
  }

  // Fallback: sign one at a time
  if (p.signTransaction) {
    const results: string[] = [];
    for (const fakeTx of fakeTxs) {
      const signed = await p.signTransaction(fakeTx);
      results.push(Buffer.from(signed.serialize()).toString("base64"));
    }
    return results;
  }

  throw new Error("Phantom signAllTransactions unavailable");
}
