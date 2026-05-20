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
  try { return Keypair.fromSecretKey(bs58.decode(key)); }
  catch { throw new Error("GEASS_WALLET_PRIVKEY is invalid base58"); }
}

/**
 * POST { createTxB64, buyTxB64?, mintPubkey, tipSol? }
 *
 * createTxB64: pre-signed by mint keypair in browser (no private key sent!)
 * buyTxB64:    optional — omit when devBuySol = 0
 *
 * Server adds GEASS signature to createTx, signs buyTx, appends tip tx, submits bundle.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "sign-server", max: 5, windowMs: 120_000 });
  if (limited) return limited;

  let body: { createTxB64: string; buyTxB64?: string; mintPubkey: string; tipSol?: number };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { createTxB64, buyTxB64, mintPubkey, tipSol = TIP_DEFAULT_SOL } = body;
  if (!createTxB64 || !mintPubkey) {
    return NextResponse.json({ error: "createTxB64 and mintPubkey are required" }, { status: 400 });
  }

  try {
    const geass     = geassKeypair();
    const conn      = new Connection(SOLANA_RPC, "confirmed");
    const client    = new JitoClient(JITO_BLOCK_ENGINE_URL);
    const tipLamps  = solToLamports(tipSol);

    // 1. Add GEASS signature to create tx (mint keypair already signed it in browser)
    const createTx = VersionedTransaction.deserialize(Buffer.from(createTxB64, "base64"));
    createTx.sign([geass]);

    // 2. Build Jito tip tx
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const tipMsg = new TransactionMessage({
      payerKey:        geass.publicKey,
      recentBlockhash: blockhash,
      instructions:    [buildTipInstruction(geass.publicKey, tipLamps)],
    }).compileToV0Message();
    const tipTx = new VersionedTransaction(tipMsg);
    tipTx.sign([geass]);

    // 3. Assemble bundle: [create, (buy if provided), tip]
    const bundle = new JitoBundle().add(createTx);
    if (buyTxB64) {
      const buyTx = VersionedTransaction.deserialize(Buffer.from(buyTxB64, "base64"));
      buyTx.sign([geass]);
      bundle.add(buyTx);
    }
    bundle.add(tipTx);

    const { bundleId } = await client.sendBundle(bundle);
    return NextResponse.json({ bundleId, mintPubkey, wallet: GEASS_WALLET_PUBKEY });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
