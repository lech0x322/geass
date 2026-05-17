import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { PUMPPORTAL_API_KEY, GEASS_WALLET_PUBKEY, GEASS_WALLET_PRIVKEY, SOLANA_RPC } from "@/lib/env";

export interface TradeParams {
  action: "buy" | "sell";
  mint: string;
  amount: number;
  denominatedInSol?: "true" | "false";
  slippage?: number;
  priorityFee?: number;
  pool?: string;
}

// Method 1: PumpPortal managed API — PumpPortal signs & broadcasts on your behalf.
// Uses PUMPPORTAL_API_KEY from env. No on-server private key needed for signing.
export async function apiTrade(params: TradeParams): Promise<{ signature: string; wallet: string }> {
  const key = PUMPPORTAL_API_KEY;
  if (!key) throw new Error("PUMPPORTAL_API_KEY not configured");

  const res = await fetch(`https://pumpportal.fun/api/trade?api-key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: params.action,
      mint: params.mint,
      amount: params.amount,
      denominatedInSol: params.denominatedInSol ?? "true",
      slippage: params.slippage ?? 10,
      priorityFee: params.priorityFee ?? 0.00005,
      pool: params.pool ?? "auto",
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PumpPortal ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { signature?: string; errors?: unknown };
  if (!data.signature) throw new Error(`PumpPortal error: ${JSON.stringify(data.errors ?? data)}`);

  return { signature: data.signature, wallet: GEASS_WALLET_PUBKEY };
}

// Method 2: trade-local — fetch unsigned tx from PumpPortal, sign with GEASS keypair, broadcast via RPC.
export async function localTrade(params: TradeParams): Promise<{ signature: string; wallet: string }> {
  const privKey = GEASS_WALLET_PRIVKEY;
  const pubKey  = GEASS_WALLET_PUBKEY;
  if (!privKey || !pubKey) throw new Error("GEASS_WALLET_PRIVKEY / GEASS_WALLET_PUBKEY not configured");

  const res = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey:        pubKey,
      action:           params.action,
      mint:             params.mint,
      denominatedInSol: params.denominatedInSol ?? "true",
      amount:           params.amount,
      slippage:         params.slippage ?? 10,
      priorityFee:      params.priorityFee ?? 0.00001,
      pool:             params.pool ?? "auto",
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PumpPortal local ${res.status}: ${text.slice(0, 200)}`);
  }

  const buf     = await res.arrayBuffer();
  const tx      = VersionedTransaction.deserialize(new Uint8Array(buf));
  const keypair = Keypair.fromSecretKey(bs58.decode(privKey));
  tx.sign([keypair]);

  const conn      = new Connection(SOLANA_RPC, "confirmed");
  const signature = await conn.sendTransaction(tx);

  return { signature, wallet: pubKey };
}
