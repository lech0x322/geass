// Client-side API — calls Next.js proxy routes and, where needed, PumpPortal directly from the browser.
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
  // Called from the browser — PumpPortal blocks server-side (cloud) IPs, so we call it directly.
  const r = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      denominatedInSol: "true",
      slippage: 15,
      priorityFee: 0.0005,
      pool: "pump",
      ...payload,
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PumpPortal ${r.status}: ${text || "Bad Request"}`);
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

/**
 * Submit a pre-built unsigned buy tx (base64) to the GEASS server for signing
 * and Jito bundle submission. The tx must be built browser-side via PumpPortal
 * (use buildPumpTx from lib/pumpportal.ts) before calling this.
 */
export async function jitoSnipe(params: {
  buyTxB64: string;
  tipSol?:  number;
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

/** Submit pre-signed base64 transactions as a Jito bundle. Server appends GEASS tip tx. */
export async function jitoSubmit(base64Txs: string[], tipSol?: number): Promise<JitoSubmitResult> {
  const r = await fetch("/api/jito/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: base64Txs, tipSol }),
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
  mintPrivB58: string; // ephemeral — used only in App.tsx to co-sign locally, never sent to server
  createTxB64: string; // pre-signed by mint keypair — Phantom adds its sig
  buyTxB64:    string; // empty string when devBuySol = 0
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
  wallet?:    string; // Phantom pubkey (phantom mode)
  server?:    boolean; // GEASS server wallet (server mode)
}): Promise<LaunchBundleResult> {
  const { Keypair, VersionedTransaction } = await import("@solana/web3.js");

  // 1. Upload metadata via server proxy (CORS-restricted endpoint)
  const ipfsForm = new FormData();
  ipfsForm.append("name",        params.name);
  ipfsForm.append("symbol",      params.symbol.toUpperCase());
  ipfsForm.append("description", params.description ?? params.name);
  ipfsForm.append("showName",    "true");
  if (params.file) ipfsForm.append("file", params.file, params.file.name);
  const { metadataUri } = await pumpIpfs(ipfsForm);

  // 2. Generate ephemeral mint keypair in browser (private key never leaves browser)
  const mintKeypair = Keypair.generate();
  const mintPubkey  = mintKeypair.publicKey.toBase58();

  // 3. Determine payer pubkey
  const payerPubkey = params.server
    ? (process.env.NEXT_PUBLIC_GEASS_WALLET_PUBKEY ?? "")
    : (params.wallet ?? "");
  if (!payerPubkey) throw new Error("No wallet connected");

  const sym = params.symbol.toUpperCase();
  const hasBuy = params.devBuySol > 0;

  // 4. Build txs in browser (PumpPortal blocks cloud IPs)
  const createBytes = await pumpTradeTx({
    publicKey: payerPubkey,
    action: "create",
    mint: mintPubkey,
    amount: params.devBuySol,
    denominatedInSol: "true",
    slippage: 10,
    priorityFee: 0.0005,
    pool: "pump",
    tokenMetadata: { name: params.name, symbol: sym, uri: metadataUri },
  });

  const buyBytes = hasBuy ? await pumpTradeTx({
    publicKey: payerPubkey,
    action: "buy",
    mint: mintPubkey,
    amount: params.devBuySol,
    denominatedInSol: "true",
    slippage: 10,
    priorityFee: 0.0005,
    pool: "pump",
  }) : null;

  // 5. Pre-sign createTx with mint keypair in browser (no private key sent to server)
  const createTx = VersionedTransaction.deserialize(createBytes);
  createTx.sign([mintKeypair]);
  const createTxB64 = Buffer.from(createTx.serialize()).toString("base64");
  const buyTxB64    = buyBytes ? Buffer.from(buyBytes).toString("base64") : undefined;

  if (params.server) {
    // 6a. GEASS server mode: send pre-signed create tx → server adds GEASS sig + tip + submits
    const r = await fetch("/api/pump/sign-server", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ createTxB64, buyTxB64, mintPubkey, tipSol: params.tipSol }),
    });
    if (!r.ok) {
      let msg = `sign-server ${r.status}`;
      try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
      throw new Error(msg);
    }
    const { bundleId } = await r.json();
    return { mode: "server", bundleId, mintPubkey, metadataUri };
  }

  // 6b. Phantom mode: return pre-signed createTx + raw buyTx for Phantom to sign
  //     mintPrivB58 is kept only so App.tsx can add the mint signature after Phantom signs
  const { default: bs58 } = await import("bs58");
  return {
    mode: "phantom",
    mintPubkey,
    mintPrivB58: bs58.encode(mintKeypair.secretKey), // used only locally in App.tsx, never sent to server
    createTxB64, // already has mint sig — Phantom adds its sig next
    buyTxB64:    buyTxB64 ?? "",
    metadataUri,
  };
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

// ── Meme Signal Detector ─────────────────────────────────────────────────────

export interface MemeSignal {
  address:     string;
  name:        string;
  symbol:      string;
  score:       number;
  volume1h:    number | null;
  marketCap:   number | null;
  replyCount:  number;
  description: string | null;
  icon:        string | null;
  pumpUrl:     string;
  createdAt:   number;
}

export interface NarrativeStat {
  id:        string;
  label:     string;
  color:     string;
  count:     number;
  totalVol:  number;
  topSymbol: string;
  topIcon:   string | null;
  momentum:  number;
}

export async function fetchMemeSignals(): Promise<{ signals: MemeSignal[]; narratives: NarrativeStat[]; fetchedAt: number }> {
  try {
    const r = await fetch("/api/trends/meme", { cache: "no-store" });
    if (!r.ok) return { signals: [], narratives: [], fetchedAt: Date.now() };
    return r.json();
  } catch {
    return { signals: [], narratives: [], fetchedAt: Date.now() };
  }
}

// ── Crypto News Feed ──────────────────────────────────────────────────────────

export interface XSignal {
  id:      string;
  text:    string;
  author:  string;
  url:     string;
  score:   number;
  source:  "news";
  icon:    string;
  pubDate: number;
}

export async function fetchXSignals(): Promise<{ signals: XSignal[]; fetchedAt: number }> {
  try {
    const r = await fetch("/api/trends/x-signals", { cache: "no-store" });
    if (!r.ok) return { signals: [], fetchedAt: Date.now() };
    return r.json();
  } catch {
    return { signals: [], fetchedAt: Date.now() };
  }
}

// ── Helius Enhanced Transactions (client) ───────────────────────────────────

import type { HeliusEnhancedTransaction } from "@/types/helius";

/** Parse a batch of signatures into enhanced transactions. */
export async function heliusParseTxs(signatures: string[]): Promise<HeliusEnhancedTransaction[]> {
  if (!signatures.length) return [];
  const r = await fetch("/api/helius/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signatures }),
  });
  if (!r.ok) return [];
  const d = await r.json() as { transactions?: HeliusEnhancedTransaction[] };
  return d.transactions ?? [];
}

/** Fetch parsed transaction history for an address. */
export async function heliusHistory(
  address: string,
  opts: { limit?: number; before?: string; until?: string; type?: string } = {},
): Promise<HeliusEnhancedTransaction[]> {
  const qs = new URLSearchParams();
  if (opts.limit)  qs.set("limit",  String(opts.limit));
  if (opts.before) qs.set("before", opts.before);
  if (opts.until)  qs.set("until",  opts.until);
  if (opts.type)   qs.set("type",   opts.type);
  const url = `/api/helius/history/${encodeURIComponent(address)}${qs.toString() ? `?${qs}` : ""}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const d = await r.json() as { transactions?: HeliusEnhancedTransaction[] };
  return d.transactions ?? [];
}

export interface SmartWalletSummary {
  addr: string;
  trades: number;
  volumeSol: number;
  realizedPnlSol: number;
  winRate: number;
  uniqueMints: number;
  firstSeen: number;
  lastSeen: number;
}

/** Top auto-discovered smart wallets from the pump.fun webhook stream. */
export async function fetchSmartWallets(limit = 50): Promise<SmartWalletSummary[]> {
  try {
    const r = await fetch(`/api/kol/smart?limit=${limit}`, { cache: "no-store" });
    if (!r.ok) return [];
    const d = await r.json() as { wallets?: SmartWalletSummary[] };
    return d.wallets ?? [];
  } catch {
    return [];
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
