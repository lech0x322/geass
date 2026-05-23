import "server-only";
import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";
import { redis } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL = 300; // 5 minutes

export interface BundleResult {
  mint: string;
  bundled: boolean;
  bundleCount: number;
  bundleSlot: number | null;
  riskLevel: "low" | "medium" | "high";
  earlyBuyers: number;
}

interface SignatureInfo {
  signature: string;
  slot: number;
  err: unknown;
  memo: string | null;
  blockTime?: number | null;
  confirmationStatus?: string;
}

function computeRiskLevel(bundleCount: number): "low" | "medium" | "high" {
  if (bundleCount >= 6) return "high";
  if (bundleCount >= 3) return "medium";
  return "low";
}

async function fetchBundleResult(mint: string): Promise<BundleResult> {
  const cacheKey = `tg:bundle:${mint}`;

  // Try Redis cache first
  const cached = await redis.get<BundleResult>(cacheKey);
  if (cached) return cached;

  // Fetch early signatures
  const sigs = await heliusRpc<SignatureInfo[]>("getSignaturesForAddress", [
    mint,
    { limit: 50 },
  ]);

  const signatures: SignatureInfo[] = Array.isArray(sigs) ? sigs : [];

  // Count unique wallets per slot (slot as proxy for same-block activity)
  // getSignaturesForAddress returns the account's own signatures so each entry
  // represents a distinct transaction (and thus a distinct buyer at launch).
  // We group by slot to find coordinated same-block purchases.
  const slotWallets = new Map<number, Set<string>>();

  for (const sig of signatures) {
    if (sig.err) continue; // skip failed txs
    const slot = sig.slot;
    if (!slotWallets.has(slot)) slotWallets.set(slot, new Set());
    // Each unique signature = unique wallet interaction in that slot
    slotWallets.get(slot)!.add(sig.signature);
  }

  let maxCount = 0;
  let bundleSlot: number | null = null;

  for (const [slot, walletSet] of slotWallets) {
    if (walletSet.size > maxCount) {
      maxCount = walletSet.size;
      bundleSlot = slot;
    }
  }

  const bundled = maxCount >= 3;
  const result: BundleResult = {
    mint,
    bundled,
    bundleCount: maxCount,
    bundleSlot: bundled ? bundleSlot : null,
    riskLevel: computeRiskLevel(maxCount),
    earlyBuyers: signatures.filter(s => !s.err).length,
  };

  // Cache in Redis for 5 minutes
  await redis.set(cacheKey, result, CACHE_TTL);

  return result;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mint = searchParams.get("mint");

  if (!mint) {
    return NextResponse.json({ error: "mint is required" }, { status: 400 });
  }

  try {
    const result = await fetchBundleResult(mint);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
