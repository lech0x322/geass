import { NextResponse } from "next/server";
import { Keypair, VersionedTransaction, Connection, TransactionMessage } from "@solana/web3.js";
import bs58 from "bs58";
import { JitoClient, JitoBundle, buildTipInstruction, solToLamports, TIP_DEFAULT_SOL } from "@geass/sdk";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { GEASS_WALLET_PRIVKEY, JITO_BLOCK_ENGINE_URL, SOLANA_RPC } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function geassKeypair(): Keypair {
  if (!GEASS_WALLET_PRIVKEY) throw new Error("GEASS_WALLET_PRIVKEY not set");
  // Strip any surrounding quotes or invisible characters Vercel may add
  const key = GEASS_WALLET_PRIVKEY.replace(/[^1-9A-HJ-NP-Za-km-z]/g, "");
  try {
    return Keypair.fromSecretKey(bs58.decode(key));
  } catch {
    throw new Error("GEASS_WALLET_PRIVKEY is invalid base58");
  }
}

/**
 * POST { createTxB64, buyTxB64, mintPrivB58, mintPubkey, tipSol? }
 *
 * Receives unsigned create + buy transactions built browser-side via PumpPortal.
 * Signs both with the GEASS wallet, appends a Jito tip transaction, and submits
 * the bundle to the Jito Block Engine.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "sign-server", max: 5, windowMs: 120_000 });
  if (limited) return limited;

  let body: { createTxB64: string; buyTxB64: string; mintPrivB58: string; mintPubkey: string; tipSol?: number };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { createTxB64, buyTxB64, mintPrivB58, mintPubkey, tipSol = TIP_DEFAULT_SOL } = body;
  if (!createTxB64 || !buyTxB64 || !mintPrivB58 || !mintPubkey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const geass   = geassKeypair();
    const mintKp  = Keypair.fromSecretKey(bs58.decode(mintPrivB58));
    const conn    = new Connection(SOLANA_RPC, "confirmed");
    const client  = new JitoClient(JITO_BLOCK_ENGINE_URL);
    const tipLamps = solToLamports(tipSol);

    // 1. Sign create tx: needs both mint keypair + GEASS keypair
    const createTx = VersionedTransaction.deserialize(Buffer.from(createTxB64, "base64"));
    createTx.sign([mintKp, geass]);

    // 2. Sign buy tx: needs only GEASS keypair
    const buyTx = VersionedTransaction.deserialize(Buffer.from(buyTxB64, "base64"));
    buyTx.sign([geass]);

    // 3. Build Jito tip transaction signed by GEASS
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const tipMsg = new TransactionMessage({
      payerKey:        geass.publicKey,
      recentBlockhash: blockhash,
      instructions:    [buildTipInstruction(geass.publicKey, tipLamps)],
    }).compileToV0Message();
    const tipTx = new VersionedTransaction(tipMsg);
    tipTx.sign([geass]);

    // 4. Submit bundle
    const bundle = new JitoBundle().add(createTx).add(buyTx).add(tipTx);
    const { bundleId } = await client.sendBundle(bundle);

    return NextResponse.json({ bundleId, mintPubkey });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
