import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { SOLANA_RPC } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirm that a freshly-launched mint actually exists on-chain.
 *
 * A Jito bundleId only means the bundle was *accepted* by the block engine —
 * it does NOT guarantee the bundle landed. This endpoint authoritatively
 * checks whether the mint account exists on Solana, so the UI can show a real
 * success/failure instead of a fake "LAUNCHED" on every accepted bundle.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "pump-confirm", max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const url  = new URL(req.url);
  const mint = url.searchParams.get("mint")?.trim() ?? "";
  if (!mint || mint.length < 32) {
    return NextResponse.json({ error: "Invalid mint" }, { status: 400 });
  }

  let mintKey: PublicKey;
  try { mintKey = new PublicKey(mint); }
  catch { return NextResponse.json({ error: "Invalid mint pubkey" }, { status: 400 }); }

  try {
    const conn = new Connection(SOLANA_RPC, "confirmed");
    const info = await conn.getAccountInfo(mintKey, "confirmed");
    // SPL mint accounts are owned by the Token (or Token-2022) program.
    const exists = info !== null && info.data.length > 0;
    return NextResponse.json({ exists, mint, owner: info?.owner.toBase58() ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
