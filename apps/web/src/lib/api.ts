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

export async function proCheckout(ref?: string): Promise<ProCheckout> {
  const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const r = await fetch(`/api/pro/checkout${qs}`, { cache: "no-store" });
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

export interface HoldingRow {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue: number | null;
  priceUsd: number | null;
}

export interface PortfolioResult {
  sol: number;
  solUsd: number | null;
  holdings: HoldingRow[];
  totalUsd: number | null;
}

export async function fetchPortfolio(wallet: string): Promise<PortfolioResult> {
  const r = await fetch(`/api/portfolio?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" });
  if (!r.ok) {
    let msg = `portfolio ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export interface AutoSnipeResult {
  signature: string;
  wallet: string;
  error?: string;
}

export async function autoSnipe(params: {
  mint: string;
  amount?: number;
  slippage?: number;
  priorityFee?: number;
  pool?: string;
  method?: "api" | "local";
}): Promise<AutoSnipeResult> {
  const r = await fetch("/api/pump/autosnipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!r.ok) {
    let msg = `autosnipe ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

// ── Jito Bundle API ──────────────────────────────────────────────────────────

export interface JitoSnipeResult {
  bundleId: string;
  tipSol: number;
  wallet: string;
}

/** Server-side Jito snipe using the GEASS wallet. */
export async function jitoSnipe(params: {
  mint: string;
  amount?: number;
  slippage?: number;
  tipSol?: number;
  pool?: string;
}): Promise<JitoSnipeResult> {
  const r = await fetch("/api/jito/snipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!r.ok) {
    let msg = `jito-snipe ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export interface JitoSubmitResult { bundleId: string }

/** Submit pre-signed base64 transactions as a Jito bundle. */
export async function jitoSubmit(base64Txs: string[]): Promise<JitoSubmitResult> {
  const r = await fetch("/api/jito/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: base64Txs }),
  });
  if (!r.ok) {
    let msg = `jito-submit ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export interface PhantomLaunchBundle {
  mode:        "phantom";
  mintPubkey:  string;
  mintPrivB58: string;
  createTxB64: string;
  buyTxB64:    string;
  metadataUri: string;
}
export interface ServerLaunchBundle {
  mode:       "server";
  bundleId:   string;
  mintPubkey: string;
  metadataUri: string;
}
export type LaunchBundleResult = PhantomLaunchBundle | ServerLaunchBundle;

/** Build a Jito launch bundle. server=true uses GEASS wallet; otherwise returns txs for Phantom. */
export async function jitoLaunchBundle(params: {
  name:       string;
  symbol:     string;
  description?: string;
  devBuySol:  number;
  tipSol:     number;
  file?:      File;
  wallet?:    string;
  server?:    boolean;
}): Promise<LaunchBundleResult> {
  const form = new FormData();
  form.append("name",      params.name);
  form.append("symbol",    params.symbol.toUpperCase());
  form.append("description", params.description ?? params.name);
  form.append("devBuySol", String(params.devBuySol));
  form.append("tipSol",    String(params.tipSol));
  if (params.wallet) form.append("wallet", params.wallet);
  if (params.server) form.append("server", "true");
  if (params.file)   form.append("file",   params.file, params.file.name);

  const r = await fetch("/api/pump/launch-bundle", { method: "POST", body: form });
  if (!r.ok) {
    let msg = `launch-bundle ${r.status}`;
    try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

// ── DEX Screener Trending ────────────────────────────────────────────────────

export interface TrendingToken {
  address:       string;
  symbol:        string;
  name:          string;
  priceUsd:      number | null;
  priceChange24: number | null;
  volume24:      number | null;
  liquidity:     number | null;
  marketCap:     number | null;
  icon:          string | null;
  boostAmount:   number;
  dexUrl:        string;
}

export interface TrendingMeta {
  name:        string;
  slug:        string;
  icon:        { type: string; value: string } | null;
  marketCap:   number;
  volume:      number;
  liquidity:   number;
  tokenCount:  number;
  mcChange24:  number;
}

export async function fetchTrending(): Promise<{ tokens: TrendingToken[]; metas: TrendingMeta[] }> {
  try {
    const r = await fetch("/api/dex/trending", { cache: "no-store" });
    if (!r.ok) return { tokens: [], metas: [] };
    return r.json();
  } catch {
    return { tokens: [], metas: [] };
  }
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
