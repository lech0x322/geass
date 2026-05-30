"use client";

import { VersionedTransaction } from "@solana/web3.js";
import { toB64 } from "./config";

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
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
    phantom?: { solana?: PhantomProvider };
  }
}

/** Returns the Phantom provider, checking both the new and legacy injection points. */
export function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  // Phantom v0.3+ injects at window.phantom.solana
  const p = window.phantom?.solana ?? window.solana;
  return p?.isPhantom ? p : null;
}

/** Wait up to `ms` milliseconds for Phantom to inject itself into the page. */
async function waitForPhantom(ms = 1500): Promise<PhantomProvider | null> {
  const found = getPhantom();
  if (found) return found;

  return new Promise(resolve => {
    const start = Date.now();
    const id = setInterval(() => {
      const p = getPhantom();
      if (p || Date.now() - start >= ms) {
        clearInterval(id);
        resolve(p);
      }
    }, 100);
  });
}

function phantomErrMsg(e: unknown): string {
  if (e instanceof Error) {
    const code = (e as Error & { code?: number }).code;
    if (code === 4001) return "Connection cancelled — please approve the request in Phantom and try again.";
    if (code === -32002) return "Phantom has a pending request — open Phantom and approve or reject it first.";
    if (code === -32603 || e.message === "Unexpected error") return "Phantom encountered an error. Try locking and unlocking your wallet, then reconnect.";
    if (e.message) return e.message;
  }
  return "Could not connect to Phantom. Try refreshing the page.";
}

export async function connectPhantom(): Promise<string> {
  const p = await waitForPhantom(2000);

  if (!p) {
    // On mobile, redirect to Phantom's in-app browser
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const url = encodeURIComponent(window.location.href);
      window.location.href = `https://phantom.app/ul/browse/${url}?ref=${url}`;
      throw new Error("Opening Phantom browser…");
    }
    window.open("https://phantom.app", "_blank");
    throw new Error("Phantom not found. Install the Phantom extension and refresh the page.");
  }

  // If already connected, return immediately
  if (p.publicKey) return p.publicKey.toString();

  // Wrap in a 15-second timeout so the UI never gets stuck forever
  const connectPromise = p.connect();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("No response from Phantom — click the Phantom icon in your browser toolbar, then try again")), 15_000),
  );

  try {
    const r = await Promise.race([connectPromise, timeoutPromise]);
    return r.publicKey.toString();
  } catch (e) {
    throw new Error(phantomErrMsg(e));
  }
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
      // fall through to deprecated path
    }
  }

  if (p.signAndSendTransaction) {
    const res = await p.signAndSendTransaction({
      serialize:        () => bytes,
      serializeMessage: () => bytes,
    });
    return res.signature;
  }

  throw new Error("Phantom signing API unavailable");
}

/**
 * Sign multiple transactions with Phantom in a single user approval.
 * Used for Jito bundle submissions. Returns base64-encoded signed transactions.
 */
export async function signAllWithPhantom(txBytes: Uint8Array[]): Promise<string[]> {
  const p = getPhantom();
  if (!p) throw new Error("Phantom not found");

  // Deserialize as VersionedTransaction so Phantom receives a proper object
  // (not a fake { serialize } stub) and can handle v0 message headers correctly.
  const versionedTxs = txBytes.map(bytes => VersionedTransaction.deserialize(bytes));

  if (p.signAllTransactions) {
    const signed = await p.signAllTransactions(versionedTxs);
    return signed.map(tx => Buffer.from(tx.serialize()).toString("base64"));
  }

  // Fallback: sign one at a time
  if (p.signTransaction) {
    const results: string[] = [];
    for (const tx of versionedTxs) {
      const signed = await p.signTransaction(tx);
      results.push(Buffer.from(signed.serialize()).toString("base64"));
    }
    return results;
  }

  throw new Error("Phantom signAllTransactions unavailable");
}
