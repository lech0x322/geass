// Client-side API — calls Next.js proxy routes only. No external URLs, no keys.
import type { Gem } from "./types";

export interface ScanResult {
  gems: Gem[];
  source: string;
  error?: string;
}

export async function scan(count = 6, signal?: AbortSignal): Promise<ScanResult> {
  const r = await fetch(`/api/scan?count=${count}`, { signal, cache: "no-store" });
  if (!r.ok && r.status !== 503) throw new Error(`scan ${r.status}`);
  return r.json();
}

export async function fetchBalance(address: string): Promise<number | null> {
  try {
    const r = await fetch(`/api/balance/${address}`, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d.sol === "number" ? d.sol : null;
  } catch {
    return null;
  }
}

export async function pumpTradeTx(payload: {
  publicKey: string;
  action: "buy" | "sell" | "create";
  mint?: string;
  amount: number;
  denominatedInSol?: "true" | "false";
  slippage?: number;
  priorityFee?: number;
  pool?: "pump";
  tokenMetadata?: { name: string; symbol: string; uri: string };
}): Promise<Uint8Array> {
  const r = await fetch("/api/pump/trade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      denominatedInSol: "true",
      slippage: 15,
      priorityFee: 0.001,
      pool: "pump",
      ...payload,
    }),
  });
  if (!r.ok) {
    let msg = `trade ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return new Uint8Array(await r.arrayBuffer());
}

export interface ProCheckout {
  treasury: string;
  amountSol: number;
  durationDays: number;
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface ProStatus {
  active: boolean;
  signature?: string;
  wallet?: string;
  paidAt?: number;
  expiresAt?: number;
  lamports?: number;
  error?: string;
}

export async function proCheckout(): Promise<ProCheckout> {
  const r = await fetch("/api/pro/checkout", { cache: "no-store" });
  if (!r.ok) {
    let msg = `checkout ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function proVerify(signature: string, wallet: string): Promise<ProStatus> {
  const r = await fetch("/api/pro/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signature, wallet }),
    cache: "no-store",
  });
  if (!r.ok && r.status !== 200) {
    let msg = `verify ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function pumpIpfs(form: FormData): Promise<{ metadataUri: string }> {
  const r = await fetch("/api/pump/ipfs", { method: "POST", body: form });
  if (!r.ok) {
    let msg = `ipfs ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}
