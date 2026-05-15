import "server-only";
import { HELIUS_RPC, HELIUS_API, HELIUS_KEY, PUMP_PROG, SKIP_MINTS } from "../env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function heliusRpc<T = any>(method: string, params: unknown[]): Promise<T> {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY missing");
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

export async function enrichedTransactions(signatures: string[]): Promise<HeliusTx[]> {
  if (!signatures.length) return [];
  const r = await fetch(`${HELIUS_API}/transactions?api-key=${HELIUS_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: signatures }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Helius TX ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

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

export async function topHolderInfo(mint: string): Promise<{ holders: number; topPct: number } | null> {
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
