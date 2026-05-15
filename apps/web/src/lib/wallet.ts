"use client";

import { toB64 } from "./config";

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
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
  // Prefer the legacy request API which accepts a base64-serialized transaction.
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
