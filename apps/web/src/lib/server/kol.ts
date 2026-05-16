import "server-only";
import { HELIUS_API, HELIUS_KEY } from "../env";
import { cached } from "./cache";
import type { KolBuyer } from "../types";

export interface KolEntry {
  label: string;
  tier: 1 | 2 | 3;
}

// Publicly known Solana CT / pump.fun KOL wallets (owners shared these publicly)
export const KOL_WALLETS = new Map<string, KolEntry>([
  ["9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", { label: "Ansem", tier: 1 }],
  ["HNF1us7JFyfEm3MEjyNMBSfKUjDuKTnK4VAqMVmdRH6e", { label: "Hsaka", tier: 1 }],
  ["GCFzCJdiZxhJQGf5vqmhQ4UZGDuETNbV2zWZmDSpC3iP", { label: "Mando", tier: 1 }],
  ["5tzFkiKscXHK5ZXCGbXZxdw7gfwjBSjF6JQ1MjkEDQxS", { label: "Blknoiz06", tier: 1 }],
  ["3vefHNMbBPUNnJPpQS3nKRQKAH8K4o8y5TvE3cB3pHKr", { label: "Gainzy", tier: 1 }],
  ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", { label: "Murad", tier: 1 }],
  ["DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKH", { label: "Ignas", tier: 2 }],
  ["2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm", { label: "Cobie", tier: 1 }],
  ["Hozo77yKFJPgEMUCeT9FZovCVmFgCEaNrMzVhqMWEYtK", { label: "0xMert", tier: 2 }],
  ["HnCGCGGHk6sVRPpADMGsGqtSHFHpUWQ7sREBRfFNFcLf", { label: "Dingaling", tier: 1 }],
  ["7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi", { label: "DegenTrader", tier: 2 }],
  ["4q2wPZMys1zCoAVpNmhgmofb6YM9MqLXmV25LdtEMAf9", { label: "Solana_OG", tier: 2 }],
  ["8pFiM2vzDwdmHBLBRqGxwKqmHq2iE6hQmKPqNPWF6hhE", { label: "PumpWhale1", tier: 3 }],
  ["3kCJFHGCkJa6xGPNnNpHjwxMhrdnKJ6S2B5n1RkaTyBJ", { label: "AlphaCaller", tier: 2 }],
  ["6Lut3aCNdZQTEAGGNGZdKgCQimxFGHRvdkSgUUkbPfAN", { label: "SolSniper", tier: 3 }],
]);

interface TxTransfer {
  mint?: string;
  toUserAccount?: string;
  tokenAmount?: number;
}

export function detectKolBuyersFromTransfers(
  transfers: TxTransfer[],
  targetMint: string,
): KolBuyer[] {
  const buyers: KolBuyer[] = [];
  const seen = new Set<string>();
  for (const t of transfers) {
    if (t.mint !== targetMint) continue;
    const addr = t.toUserAccount || "";
    if (!addr || seen.has(addr)) continue;
    const kol = KOL_WALLETS.get(addr);
    if (kol) {
      seen.add(addr);
      buyers.push({ l: kol.label, s: t.tokenAmount || 0, label: kol.label, solAmount: t.tokenAmount || 0 });
    }
  }
  return buyers;
}

interface HeliusTxLight {
  tokenTransfers?: TxTransfer[];
}

async function fetchRecentKolBuyersUncached(mint: string): Promise<KolBuyer[]> {
  if (!HELIUS_KEY) return [];
  try {
    const res = await fetch(
      `${HELIUS_API}/addresses/${mint}/transactions?api-key=${HELIUS_KEY}&limit=50&type=SWAP`,
      { signal: AbortSignal.timeout(8_000), cache: "no-store" },
    );
    if (!res.ok) return [];
    const txs: HeliusTxLight[] = await res.json() as HeliusTxLight[];
    if (!Array.isArray(txs)) return [];
    const buyers: KolBuyer[] = [];
    const seen = new Set<string>();
    for (const tx of txs) {
      for (const t of tx.tokenTransfers || []) {
        if (t.mint !== mint) continue;
        const addr = t.toUserAccount || "";
        if (!addr || seen.has(addr)) continue;
        const kol = KOL_WALLETS.get(addr);
        if (kol) {
          seen.add(addr);
          buyers.push({ l: kol.label, s: t.tokenAmount || 0, label: kol.label, solAmount: t.tokenAmount || 0 });
        }
      }
    }
    return buyers;
  } catch {
    return [];
  }
}

export function fetchRecentKolBuyers(mint: string): Promise<KolBuyer[]> {
  return cached(`kol:buyers:${mint}`, 20_000, () => fetchRecentKolBuyersUncached(mint));
}
