import "server-only";
import { HELIUS_RPC, HELIUS_API, HELIUS_KEY, PUMP_PROG, SKIP_MINTS } from "../env";
import { cached } from "./cache";
import type { HeliusEnhancedTransaction } from "@/types/helius";

/** Retry an async fn up to `attempts` times with exponential backoff. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i === attempts - 1) break;
      // backoff: 400ms, 800ms, 1600ms
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function heliusRpc<T = any>(method: string, params: unknown[]): Promise<T> {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY missing");
  return withRetry(async () => {
    const r = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Helius RPC ${r.status}`);
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.result;
  });
}

export interface HeliusTxTransfer {
  mint?: string;
  fromUserAccount?: string;
  toUserAccount?: string;
  tokenAmount?: number;
}

export interface HeliusTx {
  signature: string;
  timestamp?: number;
  tokenTransfers?: HeliusTxTransfer[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events?: any;
}

/**
 * Parse a batch of transaction signatures (up to 100 per call).
 * POST /v0/transactions
 */
export async function parseTransactions(signatures: string[]): Promise<HeliusEnhancedTransaction[]> {
  if (!signatures.length) return [];
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY missing");
  return withRetry(async () => {
    const r = await fetch(`${HELIUS_API}/transactions?api-key=${HELIUS_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: signatures.slice(0, 100) }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Helius parse ${r.status}`);
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  });
}

/** Convenience wrapper to parse a single signature. */
export async function getParsedTransaction(signature: string): Promise<HeliusEnhancedTransaction | null> {
  const res = await parseTransactions([signature]);
  return res[0] ?? null;
}

/**
 * Get parsed transaction history for an address.
 * GET /v0/addresses/{address}/transactions
 */
export async function getTransactionHistory(
  address: string,
  opts: { limit?: number; before?: string; until?: string; type?: string } = {},
): Promise<HeliusEnhancedTransaction[]> {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY missing");
  const params = new URLSearchParams({ "api-key": HELIUS_KEY });
  if (opts.limit)  params.set("limit",  String(Math.min(opts.limit, 100)));
  if (opts.before) params.set("before", opts.before);
  if (opts.until)  params.set("until",  opts.until);
  if (opts.type)   params.set("type",   opts.type);

  return withRetry(async () => {
    const r = await fetch(`${HELIUS_API}/addresses/${address}/transactions?${params}`, {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Helius history ${r.status}`);
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  });
}

/** @deprecated alias kept for backwards compat — use `parseTransactions`. */
export const enrichedTransactions = parseTransactions;

export async function pumpSignatures(limit = 30): Promise<Array<{ signature: string; blockTime?: number }>> {
  const sigs = await heliusRpc<Array<{ signature: string; blockTime?: number }>>("getSignaturesForAddress", [
    PUMP_PROG,
    { limit },
  ]);
  return sigs || [];
}

export function extractMintCandidates(txs: HeliusTx[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tx of txs) {
    for (const t of tx.tokenTransfers || []) {
      if (t.mint && !SKIP_MINTS.has(t.mint)) {
        counts.set(t.mint, (counts.get(t.mint) || 0) + 1);
      }
    }
  }
  return counts;
}

async function topHolderInfoUncached(mint: string): Promise<{ holders: number; topPct: number } | null> {
  try {
    const res = await heliusRpc<{ value: Array<{ uiAmount?: number; amount?: string }> }>(
      "getTokenLargestAccounts",
      [mint],
    );
    const accs = res?.value || [];
    if (!accs.length) return null;
    const total = accs.reduce((s, a) => s + (a.uiAmount || 0), 0);
    if (total <= 0) return { holders: accs.length, topPct: 0 };
    const topPct = ((accs[0]?.uiAmount || 0) / total) * 100;
    return { holders: accs.length, topPct };
  } catch {
    return null;
  }
}

export function topHolderInfo(mint: string): Promise<{ holders: number; topPct: number } | null> {
  return cached(`helius:holders:${mint}`, 30_000, () => topHolderInfoUncached(mint));
}
