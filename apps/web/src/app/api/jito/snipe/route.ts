import { NextResponse } from "next/server";
import { Keypair, VersionedTransaction, Connection, TransactionMessage } from "@solana/web3.js";
import bs58 from "bs58";
import { JitoClient, JitoBundle, buildTipInstruction, solToLamports, TIP_DEFAULT_SOL } from "@geass/sdk";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { GEASS_WALLET_PRIVKEY, GEASS_WALLET_PUBKEY, JITO_BLOCK_ENGINE_URL, SOLANA_RPC } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function geassKeypair(): Keypair {
  if (!GEASS_WALLET_PRIVKEY) throw new Error("GEASS_WALLET_PRIVKEY not set");
  const key = GEASS_WALLET_PRIVKEY.replace(/[^1-9A-HJ-NP-Za-km-z]/g, "");
  try {
    return Keypair.fromSecretKey(bs58.decode(key));
  } catch {
    throw new Error("GEASS_WALLET_PRIVKEY is invalid base58");
  }
}

/**
 * POST { buyTxB64, tipSol? }
 *
 * Receives an unsigned buy transaction built browser-side via PumpPortal
 * (PumpPortal blocks cloud/Vercel IPs — must be called from the browser).
 * Signs with the GEASS wallet, appends a Jito tip tx, submits the bundle.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "jito-snipe", max: 5, windowMs: 60_000 });
  if (limited) return limited;

  let body: { buyTxB64: string; tipSol?: number };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.buyTxB64) {
    return NextResponse.json({ error: "buyTxB64 is required" }, { status: 400 });
  }

  try {
    const geass    = geassKeypair();
    const conn     = new Connection(SOLANA_RPC, "confirmed");
    const client   = new JitoClient(JITO_BLOCK_ENGINE_URL);
    const tipSol   = body.tipSol ?? TIP_DEFAULT_SOL;
    const tipLamps = solToLamports(tipSol);

    // Sign buy tx with GEASS keypair
    const buyTx = VersionedTransaction.deserialize(Buffer.from(body.buyTxB64, "base64"));
    buyTx.sign([geass]);

    // Build Jito tip tx
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const tipMsg = new TransactionMessage({
      payerKey:        geass.publicKey,
      recentBlockhash: blockhash,
      instructions:    [buildTipInstruction(geass.publicKey, tipLamps)],
    }).compileToV0Message();
    const tipTx = new VersionedTransaction(tipMsg);
    tipTx.sign([geass]);

    // Submit bundle [buy, tip]
    const bundle = new JitoBundle().add(buyTx).add(tipTx);
    const { bundleId } = await client.sendBundle(bundle);

    return NextResponse.json({ bundleId, tipSol, wallet: GEASS_WALLET_PUBKEY });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
