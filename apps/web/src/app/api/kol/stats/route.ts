import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTransactionHistory } from "@/lib/server/helius";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/kol/stats?addrs=<addr1,addr2,...>
 *
 * Computes REAL on-chain activity for each wallet over the last 30 days from
 * Helius enhanced history:
 *   - swaps30d:   number of SWAP transactions in the window
 *   - netSol30d:  net native-SOL balance change across those swaps (SOL)
 *
 * This replaces the previously hardcoded PnL / win-rate numbers with metrics
 * that are actually derived from the chain. netSol30d is an approximation of
 * realized SOL flow (it ignores the unrealized value of tokens still held).
 */

const WINDOW_DAYS = 30;
const PAGE_LIMIT  = 100;   // Helius max per call
const MAX_PAGES   = 5;     // cap work: up to 500 swaps per wallet

interface KolStat {
  addr:      string;
  swaps30d:  number;
  netSol30d: number;
  ok:        boolean;
}

async function statsForWallet(addr: string): Promise<KolStat> {
  const cutoff = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86_400;
  let swaps = 0;
  let netLamports = 0;
  let before: string | undefined;
  let ok = true;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const txs = await getTransactionHistory(addr, { limit: PAGE_LIMIT, before, type: "SWAP" });
      if (!Array.isArray(txs) || txs.length === 0) break;

      let reachedCutoff = false;
      for (const tx of txs) {
        if (typeof tx.timestamp === "number" && tx.timestamp < cutoff) { reachedCutoff = true; break; }
        if (tx.transactionError) continue;
        swaps++;
        const acct = tx.accountData?.find(a => a.account === addr);
        if (acct && typeof acct.nativeBalanceChange === "number") {
          netLamports += acct.nativeBalanceChange;
        }
      }

      before = txs[txs.length - 1]?.signature;
      if (reachedCutoff || txs.length < PAGE_LIMIT || !before) break;
    }
  } catch {
    ok = false;
  }

  return {
    addr,
    swaps30d:  swaps,
    netSol30d: netLamports / LAMPORTS_PER_SOL,
    ok,
  };
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { bucket: "kol-stats", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const raw = req.nextUrl.searchParams.get("addrs") ?? "";
  const addrs = raw.split(",").map(s => s.trim()).filter(s => s.length >= 32).slice(0, 12);
  if (addrs.length === 0) {
    return NextResponse.json({ error: "addrs required" }, { status: 400 });
  }

  const stats = await Promise.all(addrs.map(statsForWallet));
  return NextResponse.json({ stats });
}
