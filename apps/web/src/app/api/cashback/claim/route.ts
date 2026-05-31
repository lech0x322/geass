import { NextResponse } from "next/server";
import {
  Connection, Keypair, SystemProgram, Transaction,
  PublicKey, LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { redis } from "@/lib/server/redis";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { SOLANA_RPC, GEASS_WALLET_PRIVKEY } from "@/lib/env";
import { getOrInit } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_CLAIM_LAMPORTS = 50_000_000; // 0.05 SOL

/** POST /api/cashback/claim  { wallet } */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "cashback_claim", max: 5, windowMs: 60_000 });
  if (limited) return limited;

  if (!GEASS_WALLET_PRIVKEY)
    return NextResponse.json({ error: "Platform wallet not configured" }, { status: 503 });

  const body = await req.json().catch(() => ({})) as { wallet?: string };
  const { wallet } = body;

  if (!wallet || wallet.length < 32)
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });

  const stats = await getOrInit(wallet);
  const lamports = Math.floor(stats.unclaimed * LAMPORTS_PER_SOL);

  if (lamports < MIN_CLAIM_LAMPORTS)
    return NextResponse.json(
      { error: `Minimum claim is 0.05 SOL. You have ${stats.unclaimed.toFixed(5)} SOL unclaimed.` },
      { status: 400 },
    );

  let signer: Keypair;
  try {
    signer = Keypair.fromSecretKey(bs58.decode(GEASS_WALLET_PRIVKEY));
  } catch {
    return NextResponse.json({ error: "Platform wallet misconfigured" }, { status: 503 });
  }

  try {
    const conn = new Connection(SOLANA_RPC, "confirmed");
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

    const tx = new Transaction({ feePayer: signer.publicKey, blockhash, lastValidBlockHeight });
    tx.add(SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey:   new PublicKey(wallet),
      lamports,
    }));
    tx.sign(signer);

    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

    const claimed = stats.unclaimed;
    await redis.hset(`cashback:${wallet}`, "unclaimed",    0);
    await redis.hset(`cashback:${wallet}`, "totalClaimed", stats.totalClaimed + claimed);

    return NextResponse.json({ success: true, claimedSol: claimed, signature: sig });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
