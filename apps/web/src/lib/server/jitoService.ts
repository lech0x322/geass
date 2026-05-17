import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  JitoClient,
  JitoBundle,
  buildTipInstruction,
  solToLamports,
  TIP_DEFAULT_SOL,
} from "@geass/sdk";
import {
  GEASS_WALLET_PRIVKEY,
  GEASS_WALLET_PUBKEY,
  JITO_BLOCK_ENGINE_URL,
  SOLANA_RPC,
} from "@/lib/env";

// ── Helpers ─────────────────────────────────────────────────────────────────

function geassKeypair(): Keypair {
  if (!GEASS_WALLET_PRIVKEY) throw new Error("GEASS_WALLET_PRIVKEY not set");
  return Keypair.fromSecretKey(bs58.decode(GEASS_WALLET_PRIVKEY));
}

function geassPublicKey(): PublicKey {
  if (!GEASS_WALLET_PUBKEY) throw new Error("GEASS_WALLET_PUBKEY not set");
  return new PublicKey(GEASS_WALLET_PUBKEY);
}

// ── PumpPortal trade-local helper ────────────────────────────────────────────

interface PumpTradeParams {
  publicKey: string;
  action: "buy" | "sell" | "create";
  mint?: string;
  amount: number;
  denominatedInSol?: "true" | "false";
  slippage?: number;
  priorityFee?: number;
  pool?: string;
  tokenMetadata?: { name: string; symbol: string; uri: string };
}

async function fetchPumpTx(params: PumpTradeParams): Promise<Uint8Array> {
  const res = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PumpPortal trade-local ${res.status}: ${t.slice(0, 200)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

// ── Inject Jito tip into an existing VersionedTransaction ────────────────────
// This mutates the message in-place by appending a SystemProgram.transfer
// instruction to the existing transaction.
// NOTE: This only works for legacy Message format where we can rebuild the tx.
// For versioned txs from PumpPortal we build a separate tip tx instead.

// ── Build a standalone tip transaction ──────────────────────────────────────

async function buildTipTx(
  payer: Keypair,
  connection: Connection,
  tipLamports: bigint,
): Promise<VersionedTransaction> {
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const msg = new TransactionMessage({
    payerKey:        payer.publicKey,
    recentBlockhash: blockhash,
    instructions:    [buildTipInstruction(payer.publicKey, tipLamports)],
  }).compileToV0Message();

  const tx = new VersionedTransaction(msg);
  tx.sign([payer]);
  return tx;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface JitoSnipeResult {
  bundleId: string;
  tipSol: number;
  wallet: string;
}

/**
 * Server-side Jito snipe: builds a 2-tx bundle (buy + tip) signed by the
 * GEASS wallet and submits it to the Jito Block Engine for atomic execution.
 */
export async function jitoSnipe(params: {
  mint: string;
  amount?: number;
  slippage?: number;
  tipSol?: number;
  pool?: string;
}): Promise<JitoSnipeResult> {
  const keypair  = geassKeypair();
  const pubkey   = geassPublicKey();
  const tipSol   = params.tipSol ?? TIP_DEFAULT_SOL;
  const tipLamps = solToLamports(tipSol);
  const conn     = new Connection(SOLANA_RPC, "confirmed");
  const client   = new JitoClient(JITO_BLOCK_ENGINE_URL);

  // 1. Build buy transaction
  const buyBytes = await fetchPumpTx({
    publicKey:        pubkey.toBase58(),
    action:           "buy",
    mint:             params.mint,
    amount:           params.amount ?? 0.01,
    denominatedInSol: "true",
    slippage:         params.slippage ?? 10,
    priorityFee:      0,                   // Jito handles priority, skip standard fee
    pool:             params.pool ?? "auto",
  });
  const buyTx = VersionedTransaction.deserialize(buyBytes);
  buyTx.sign([keypair]);

  // 2. Build tip transaction (separate tx — last in bundle)
  const tipTx = await buildTipTx(keypair, conn, tipLamps);

  // 3. Assemble and submit bundle
  const bundle = new JitoBundle().add(buyTx).add(tipTx);
  const { bundleId } = await client.sendBundle(bundle);

  return { bundleId, tipSol, wallet: pubkey.toBase58() };
}

export interface JitoLaunchResult {
  createTxB58: string;
  buyTxB58:    string;
  tipTxB58:    string;
  bundleId?:   string;
}

/**
 * Build a 3-tx launch bundle (create + dev buy + tip) using the GEASS wallet,
 * sign everything server-side, and submit to Jito.
 *
 * For user-wallet launch (Phantom signing), use buildLaunchTxsForPhantom() instead.
 */
export async function jitoLaunchServer(params: {
  metadataUri: string;
  tokenName:   string;
  tokenSymbol: string;
  devBuySol:   number;
  tipSol?:     number;
}): Promise<{ bundleId: string; mintPubkey: string }> {
  const keypair  = geassKeypair();
  const pubkey   = geassPublicKey();
  const tipSol   = params.tipSol ?? TIP_DEFAULT_SOL;
  const tipLamps = solToLamports(tipSol);
  const conn     = new Connection(SOLANA_RPC, "confirmed");
  const client   = new JitoClient(JITO_BLOCK_ENGINE_URL);

  // Generate fresh mint keypair
  const mintKeypair = Keypair.generate();

  // 1. Create tx
  const createBytes = await fetchPumpTx({
    publicKey:     pubkey.toBase58(),
    action:        "create",
    mint:          mintKeypair.publicKey.toBase58(),
    amount:        params.devBuySol,
    denominatedInSol: "true",
    slippage:      10,
    priorityFee:   0,
    pool:          "pump",
    tokenMetadata: {
      name:   params.tokenName,
      symbol: params.tokenSymbol,
      uri:    params.metadataUri,
    },
  });
  const createTx = VersionedTransaction.deserialize(createBytes);
  createTx.sign([mintKeypair, keypair]);

  // 2. Dev buy tx
  const buyBytes = await fetchPumpTx({
    publicKey:        pubkey.toBase58(),
    action:           "buy",
    mint:             mintKeypair.publicKey.toBase58(),
    amount:           params.devBuySol,
    denominatedInSol: "true",
    slippage:         10,
    priorityFee:      0,
    pool:             "pump",
  });
  const buyTx = VersionedTransaction.deserialize(buyBytes);
  buyTx.sign([keypair]);

  // 3. Tip tx
  const tipTx = await buildTipTx(keypair, conn, tipLamps);

  // 4. Submit
  const bundle = new JitoBundle().add(createTx).add(buyTx).add(tipTx);
  const { bundleId } = await client.sendBundle(bundle);

  return { bundleId, mintPubkey: mintKeypair.publicKey.toBase58() };
}

/**
 * Build unsigned create + buy transactions for the USER's Phantom wallet to sign.
 * Returns raw bytes arrays. The frontend signs and calls /api/jito/submit.
 */
export async function buildLaunchTxsForPhantom(params: {
  walletPubkey: string;
  metadataUri:  string;
  tokenName:    string;
  tokenSymbol:  string;
  devBuySol:    number;
  tipSol?:      number;
}): Promise<{
  mintPubkey:  string;
  mintPrivB58: string;
  createTxB64: string;
  buyTxB64:    string;
}> {
  const mintKeypair = Keypair.generate();
  const tipSol      = params.tipSol ?? TIP_DEFAULT_SOL;
  const tipLamps    = solToLamports(tipSol);
  const payer       = new PublicKey(params.walletPubkey);

  // create tx — unsigned (Phantom + mintKeypair will sign)
  const createBytes = await fetchPumpTx({
    publicKey:     params.walletPubkey,
    action:        "create",
    mint:          mintKeypair.publicKey.toBase58(),
    amount:        params.devBuySol,
    denominatedInSol: "true",
    slippage:      10,
    priorityFee:   0,
    pool:          "pump",
    tokenMetadata: {
      name:   params.tokenName,
      symbol: params.tokenSymbol,
      uri:    params.metadataUri,
    },
  });
  // Pre-sign create tx with mintKeypair only; Phantom will add its signature
  const createTx = VersionedTransaction.deserialize(createBytes);
  createTx.sign([mintKeypair]);

  // buy tx — tip instruction appended server-side so it's already baked in
  const buyBytes = await fetchPumpTx({
    publicKey:        params.walletPubkey,
    action:           "buy",
    mint:             mintKeypair.publicKey.toBase58(),
    amount:           params.devBuySol,
    denominatedInSol: "true",
    slippage:         10,
    priorityFee:      0,
    pool:             "pump",
  });
  // We return the buy tx as-is; tip is appended via a 3rd tx in the bundle on submit.
  // For simplicity we bundle: [createTx, buyTx, tipTx] where tipTx is built client-side.

  return {
    mintPubkey:  mintKeypair.publicKey.toBase58(),
    mintPrivB58: bs58.encode(mintKeypair.secretKey),
    createTxB64: Buffer.from(createTx.serialize()).toString("base64"),
    buyTxB64:    Buffer.from(buyBytes).toString("base64"),
  };
}

/** Submit an array of base64-encoded pre-signed transactions as a Jito bundle. */
export async function submitJitoBundle(base64Txs: string[]): Promise<{ bundleId: string }> {
  const client = new JitoClient(JITO_BLOCK_ENGINE_URL);
  const b58Txs = base64Txs.map(b64 =>
    bs58.encode(Buffer.from(b64, "base64")),
  );
  return client.sendRaw(b58Txs);
}
