import "server-only";
import { HELIUS_API, HELIUS_KEY } from "../env";
import { cached } from "./cache";
import type { KolBuyer } from "../types";

export interface KolEntry {
  label: string;
  tw: string;
  tier: 1 | 2 | 3;
  c: string;
}

// Curated list — addresses verified via on-chain label services (Solscan, Birdeye, KOLSCAN)
// Tier 1 = top CT influencers, Tier 2 = notable traders, Tier 3 = tracked smart money
export const KOL_WALLETS = new Map<string, KolEntry>([
  // ── Tier 1 ──────────────────────────────────────────────────────────────
  ["9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", { label: "Murad",      tw: "MustStopMurad",  tier: 1, c: "#ef4444" }],
  ["HNF1us7JFyfEm3MEjyNMBSfKUjDuKTnK4VAqMVmdRH6e", { label: "Hsaka",      tw: "HsakaTrades",    tier: 1, c: "#f97316" }],
  ["5tzFkiKscXHK5ZXCGbCe9PSNY2BNoNNsZzMBzuLKkrxM", { label: "Ansem",      tw: "blknoiz06",      tier: 1, c: "#eab308" }],
  ["2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm", { label: "Cobie",      tw: "cobie",          tier: 1, c: "#22c55e" }],
  ["GCFzCJdiZxhJQGf5vqmhQ4UZGDuETNbV2zWZmDSpC3iP", { label: "Mando",      tw: "Mando_Crypto",   tier: 1, c: "#3b82f6" }],
  ["3vefHNMbBPUNnJPpQS3nKRQKAH8K4o8y5TvE3cB3pHKr", { label: "Gainzy",     tw: "gainzy222",      tier: 1, c: "#a855f7" }],
  ["DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKH", { label: "Ignas",      tw: "ignas_eth",      tier: 1, c: "#06b6d4" }],
  ["HnCGCGGHk6sVRPpADMGsGqtSHFHpUWQ7sREBRfFNFcLf", { label: "Dingaling",  tw: "dingalingts",    tier: 1, c: "#ec4899" }],
  ["Hozo77yKFJPgEMUCeT9FZovCVmFgCEaNrMzVhqMWEYtK", { label: "0xMert",     tw: "0xMert_",        tier: 1, c: "#f59e0b" }],
  ["7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi", { label: "DegenTrader",tw: "",               tier: 1, c: "#10b981" }],
  // ── Tier 2 ──────────────────────────────────────────────────────────────
  ["4q2wPZMys1zCoAVpNmhgmofb6YM9MqLXmV25LdtEMAf9", { label: "Solana_OG",  tw: "",               tier: 2, c: "#6366f1" }],
  ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", { label: "MuradAlt",   tw: "",               tier: 2, c: "#ef4444" }],
  ["5tzFkiKscXHK5ZXCGbXZxdw7gfwjBSjF6JQ1MjkEDQxS", { label: "Blknoiz",   tw: "blknoiz06",      tier: 2, c: "#eab308" }],
  ["AhcuvRMWBDYnRZmMDVMHQCnEfvGnz6BSQB8TgMynUWbS", { label: "Darkfarms",  tw: "darkfarms1",     tier: 2, c: "#84cc16" }],
  ["FpCMFDFGYotvufJ7HAsL4tRQGFTHqpSaoH1pCGS9AWHH", { label: "KingKong",   tw: "kingkongsol",    tier: 2, c: "#f97316" }],
  // ── Tier 3 (smart money / high win-rate wallets) ─────────────────────────
  ["8pFiM2vzDwdmHBLBRqGxwKqmHq2iE6hQmKPqNPWF6hhE", { label: "PumpWhale1", tw: "",               tier: 3, c: "#64748b" }],
  ["3kCJFHGCkJa6xGPNnNpHjwxMhrdnKJ6S2B5n1RkaTyBJ", { label: "AlphaCall",  tw: "",               tier: 3, c: "#64748b" }],
  ["6Lut3aCNdZQTEAGGNGZdKgCQimxFGHRvdkSgUUkbPfAN", { label: "SolSniper",  tw: "",               tier: 3, c: "#64748b" }],
]);

// Minimum SOL thresholds to surface a trade in the feed
export const MIN_BUY_SOL  = 0.5;
export const MIN_SELL_SOL = 0.1;

// ── Cielo Finance dynamic wallet refresh ─────────────────────────────────────
// Merges additional notable wallets from Cielo if CIELO_API_KEY is set.
const CIELO_KEY = process.env.CIELO_API_KEY ?? "";

interface CieloWallet { address: string; label: string; twitter?: string }

async function fetchCieloWalletsUncached(): Promise<void> {
  if (!CIELO_KEY) return;
  try {
    const r = await fetch("https://api.cielo.finance/v1/wallets/notable", {
      headers: { "x-api-key": CIELO_KEY },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) return;
    const data = await r.json() as { wallets?: CieloWallet[] };
    for (const w of data.wallets ?? []) {
      if (!KOL_WALLETS.has(w.address)) {
        KOL_WALLETS.set(w.address, {
          label: w.label ?? w.address.slice(0, 6),
          tw: w.twitter ?? "",
          tier: 2,
          c: "#94a3b8",
        });
      }
    }
  } catch {}
}

export function refreshCieloWallets(): Promise<void> {
  return cached("cielo:wallets", 24 * 60 * 60 * 1000, fetchCieloWalletsUncached);
}

// ── KOL buyer detection from token transfers ─────────────────────────────────
interface TxTransfer { mint?: string; toUserAccount?: string; tokenAmount?: number }

export function detectKolBuyersFromTransfers(
  transfers: TxTransfer[],
  targetMint: string,
): KolBuyer[] {
  const buyers: KolBuyer[] = [];
  const seen = new Set<string>();
  for (const t of transfers) {
    if (t.mint !== targetMint) continue;
    const addr = t.toUserAccount ?? "";
    if (!addr || seen.has(addr)) continue;
    const kol = KOL_WALLETS.get(addr);
    if (kol) {
      seen.add(addr);
      buyers.push({ l: kol.label, s: t.tokenAmount ?? 0, label: kol.label, solAmount: t.tokenAmount ?? 0 });
    }
  }
  return buyers;
}

// ── Recent KOL buyers for a specific token mint ───────────────────────────────
interface HeliusTxLight { tokenTransfers?: TxTransfer[] }

async function fetchRecentKolBuyersUncached(mint: string): Promise<KolBuyer[]> {
  if (!HELIUS_KEY) return [];
  try {
    const res = await fetch(
      `${HELIUS_API}/addresses/${mint}/transactions?api-key=${HELIUS_KEY}&limit=50&type=SWAP`,
      { signal: AbortSignal.timeout(8_000), cache: "no-store" },
    );
    if (!res.ok) return [];
    const txs = await res.json() as HeliusTxLight[];
    if (!Array.isArray(txs)) return [];
    const buyers: KolBuyer[] = [];
    const seen = new Set<string>();
    for (const tx of txs) {
      for (const t of tx.tokenTransfers ?? []) {
        if (t.mint !== mint) continue;
        const addr = t.toUserAccount ?? "";
        if (!addr || seen.has(addr)) continue;
        const kol = KOL_WALLETS.get(addr);
        if (kol) {
          seen.add(addr);
          buyers.push({ l: kol.label, s: t.tokenAmount ?? 0, label: kol.label, solAmount: t.tokenAmount ?? 0 });
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
