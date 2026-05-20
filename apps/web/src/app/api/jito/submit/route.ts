import { NextResponse } from "next/server";
import { Keypair, Connection, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { JitoClient, JitoBundle, buildTipInstruction, solToLamports, TIP_DEFAULT_SOL } from "@geass/sdk";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { GEASS_WALLET_PRIVKEY, JITO_BLOCK_ENGINE_URL, SOLANA_RPC } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function geassKeypair(): Keypair {
  if (!GEASS_WALLET_PRIVKEY) throw new Error("GEASS_WALLET_PRIVKEY not set");
  const key = GEASS_WALLET_PRIVKEY.replace(/[^1-9A-HJ-NP-Za-km-z]/g, "");
  try { return Keypair.fromSecretKey(bs58.decode(key)); }
  catch { throw new Error("GEASS_WALLET_PRIVKEY is invalid base58"); }
}

/**
 * POST { transactions: string[], tipSol?: number }
 *
 * Accepts pre-signed base64 transactions (e.g. Phantom-signed create + buy).
 * Appends a GEASS-signed Jito tip tx automatically so the bundle is valid.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "jito-submit", max: 8, windowMs: 60_000 });
  if (limited) return limited;

  let body: { transactions: string[]; tipSol?: number };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
    return NextResponse.json({ error: "transactions must be a non-empty array" }, { status: 400 });
  }
  if (body.transactions.length > 4) {
    return NextResponse.json({ error: "Maximum 4 user transactions per bundle" }, { status: 400 });
  }

  try {
    const geass  = geassKeypair();
    const conn   = new Connection(SOLANA_RPC, "confirmed");
    const client = new JitoClient(JITO_BLOCK_ENGINE_URL);
    const tipSol = typeof body.tipSol === "number" && body.tipSol > 0 ? body.tipSol : TIP_DEFAULT_SOL;

    const txs = body.transactions.map(b64 =>
      VersionedTransaction.deserialize(Buffer.from(b64, "base64")),
    );

    // Build + sign the Jito tip tx (must be last in the bundle)
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const tipMsg = new TransactionMessage({
      payerKey:        geass.publicKey,
      recentBlockhash: blockhash,
      instructions:    [buildTipInstruction(geass.publicKey, solToLamports(tipSol))],
    }).compileToV0Message();
    const tipTx = new VersionedTransaction(tipMsg);
    tipTx.sign([geass]);

    const bundle = new JitoBundle();
    txs.forEach(tx => bundle.add(tx));
    bundle.add(tipTx);

    const { bundleId } = await client.sendBundle(bundle);
    return NextResponse.json({ bundleId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
