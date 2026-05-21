"use client";

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


export async function connectPhantom(): Promise<string> {
  // Check immediately — don't wait if Phantom is already injected
  let p = getPhantom();

  if (!p) {
    // Give the extension up to 800ms to inject itself; poll fast so we don't
    // lose the browser's "trusted user gesture" context before calling connect().
    p = await new Promise<PhantomProvider | null>(resolve => {
      const deadline = Date.now() + 800;
      const id = setInterval(() => {
        const found = getPhantom();
        if (found || Date.now() >= deadline) {
          clearInterval(id);
          resolve(found);
        }
      }, 50);
    });
  }

  if (!p) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const encoded = encodeURIComponent(window.location.href);
      window.location.href = `https://phantom.app/ul/browse/${encoded}?ref=${encoded}`;
      throw new Error("Opening Phantom…");
    }
    window.open("https://phantom.app", "_blank", "noopener");
    throw new Error("Phantom not installed. Install the extension and refresh this page.");
  }

  // Already approved — return without a second popup
  if (p.publicKey) return p.publicKey.toString();

  // p.connect() is called immediately after detecting Phantom so it stays
  // within the trusted user-gesture window and the popup opens automatically.
  const r = await Promise.race([
    p.connect(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Phantom didn't respond. Click the Phantom icon in your toolbar to approve.")),
        30_000,
      ),
    ),
  ]);

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

  const fakeTxs = txBytes.map(bytes => ({ serialize: () => bytes }));

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
