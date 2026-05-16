import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { PRO_TREASURY_WALLET, PRO_PRICE_SOL, PRO_DURATION_MS } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParsedTx {
  blockTime?: number;
  meta?: { err: unknown | null; preBalances?: number[]; postBalances?: number[] } | null;
  transaction?: {
    message?: {
      accountKeys?: Array<{ pubkey: string; signer?: boolean } | string>;
      instructions?: Array<{
        program?: string;
        programId?: string;
        parsed?: { type?: string; info?: { source?: string; destination?: string; lamports?: number } };
      }>;
    };
  };
}

function keyAt(keys: NonNullable<NonNullable<ParsedTx["transaction"]>["message"]>["accountKeys"], i: number): string | null {
  const k = keys?.[i];
  if (!k) return null;
  return typeof k === "string" ? k : k.pubkey;
}

async function verifyTx(signature: string, wallet: string): Promise<{ ok: true; lamports: number; blockTime: number } | { ok: false; error: string }> {
  const tx = await heliusRpc<ParsedTx | null>("getTransaction", [
    signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
  ]);

  if (!tx) return { ok: false, error: "Transaction not found or not yet confirmed" };
  if (tx.meta?.err) return { ok: false, error: "Transaction failed on-chain" };

  const minLamports = Math.floor(PRO_PRICE_SOL * 1e9);
  const blockTime = tx.blockTime ?? Math.floor(Date.now() / 1000);

  // 1) Look for an explicit SystemProgram.transfer instruction (most reliable)
  const ixs = tx.transaction?.message?.instructions || [];
  for (const ix of ixs) {
    const parsed = ix.parsed;
    if (!parsed) continue;
    if (parsed.type !== "transfer" && parsed.type !== "transferChecked") continue;
    if (ix.program !== "system" && ix.programId !== "11111111111111111111111111111111") continue;
    const info = parsed.info;
    if (!info) continue;
    if (info.source !== wallet) continue;
    if (info.destination !== PRO_TREASURY_WALLET) continue;
    if (typeof info.lamports !== "number" || info.lamports < minLamports) continue;
    return { ok: true, lamports: info.lamports, blockTime };
  }

  // 2) Fallback: compute the net balance delta between wallet → treasury
  const keys = tx.transaction?.message?.accountKeys || [];
  const pre = tx.meta?.preBalances || [];
  const post = tx.meta?.postBalances || [];
  let walletIdx = -1, treasuryIdx = -1;
  for (let i = 0; i < keys.length; i++) {
    const k = keyAt(keys, i);
    if (k === wallet) walletIdx = i;
    if (k === PRO_TREASURY_WALLET) treasuryIdx = i;
  }
  if (walletIdx >= 0 && treasuryIdx >= 0) {
    const sent = (pre[walletIdx] ?? 0) - (post[walletIdx] ?? 0);
    const received = (post[treasuryIdx] ?? 0) - (pre[treasuryIdx] ?? 0);
    if (received >= minLamports && sent >= minLamports) {
      return { ok: true, lamports: received, blockTime };
    }
  }

  return { ok: false, error: `Payment of ≥${PRO_PRICE_SOL} SOL from ${wallet.slice(0, 6)}... to treasury not found in this transaction` };
}

async function handle(req: Request, signature: string, wallet: string) {
  const limited = enforceRateLimit(req, { bucket: "pro_verify", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  if (!PRO_TREASURY_WALLET) {
    return NextResponse.json({ error: "PRO_TREASURY_WALLET not configured" }, { status: 503 });
  }
  if (!signature || signature.length < 64) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (!wallet || wallet.length < 32) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }

  try {
    const r = await verifyTx(signature, wallet);
    if (!r.ok) {
      return NextResponse.json({ active: false, error: r.error }, { status: 200 });
    }
    const paidAt = r.blockTime * 1000;
    const expiresAt = paidAt + PRO_DURATION_MS;
    const active = Date.now() < expiresAt;
    return NextResponse.json({
      active,
      signature,
      wallet,
      paidAt,
      expiresAt,
      lamports: r.lamports,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return handle(req, url.searchParams.get("signature") ?? "", url.searchParams.get("wallet") ?? "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle(req, body?.signature ?? "", body?.wallet ?? "");
}
