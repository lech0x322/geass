import { NextResponse } from "next/server";
import { PRO_TREASURY_WALLET, PRO_PRICE_SOL } from "@/lib/env";
import { publish } from "@/lib/server/proEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HeliusEnhancedTx {
  signature?: string;
  timestamp?: number;
  nativeTransfers?: Array<{ fromUserAccount?: string; toUserAccount?: string; amount?: number }>;
  accountData?: Array<{ account?: string; nativeBalanceChange?: number }>;
}

export async function POST(req: Request) {
  // Optional shared-secret auth. If unset, accept all (dev). In prod set it.
  const expected = process.env.HELIUS_WEBHOOK_AUTH;
  if (expected) {
    const got = req.headers.get("authorization") ?? "";
    if (got !== expected) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  if (!PRO_TREASURY_WALLET) {
    return NextResponse.json({ ok: false, error: "treasury not configured" }, { status: 200 });
  }

  let events: HeliusEnhancedTx[] = [];
  try {
    const body = await req.json();
    events = Array.isArray(body) ? body : [body];
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 200 });
  }

  const minLamports = Math.floor(PRO_PRICE_SOL * 1e9);
  let matched = 0;

  for (const tx of events) {
    if (!tx?.signature) continue;
    const ts = (tx.timestamp ?? Math.floor(Date.now() / 1000)) * 1000;

    // Primary: explicit nativeTransfers (Helius enhanced format)
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === PRO_TREASURY_WALLET
        && typeof t.amount === "number"
        && t.amount >= minLamports
        && t.fromUserAccount) {
        publish({ wallet: t.fromUserAccount, signature: tx.signature, lamports: t.amount, timestamp: ts });
        matched++;
      }
    }

    // Fallback: balance deltas (TRANSFER classification sometimes omits nativeTransfers)
    if (matched === 0 && tx.accountData) {
      const treasuryDelta = tx.accountData.find(a => a.account === PRO_TREASURY_WALLET)?.nativeBalanceChange ?? 0;
      if (treasuryDelta >= minLamports) {
        const sender = tx.accountData.find(a => (a.nativeBalanceChange ?? 0) <= -minLamports);
        if (sender?.account) {
          publish({ wallet: sender.account, signature: tx.signature, lamports: treasuryDelta, timestamp: ts });
          matched++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, matched });
}
