import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

// Mainnet Jito tip accounts — any one must receive the tip for the bundle to be valid.
// Source: https://jito-foundation.gitbook.io/mev/jito-bundles/sending-bundles
export const JITO_TIP_ACCOUNTS: string[] = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvB8eMTWCarS8UvW1PNYZ8kqnMKCr3vr2b",
  "Cw8CFyM9FkoMi7K7Cyd7yx9eea2R56qCg8oKsSmkCyqr",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1sMXCMt6BGQ",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6Jv",
];

/** Pick a random Jito tip account each call to distribute tip load. */
export function pickTipAccount(): PublicKey {
  const addr = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
  return new PublicKey(addr);
}

/** Convert SOL float to lamports bigint. */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * 1_000_000_000));
}

/**
 * Build a SystemProgram.transfer instruction that pays the Jito tip.
 * Inject this as the LAST instruction in the last tx of your bundle.
 */
export function buildTipInstruction(
  payer: PublicKey,
  tipLamports: bigint,
  tipAccount?: PublicKey,
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey:   tipAccount ?? pickTipAccount(),
    lamports:   tipLamports,
  });
}

/**
 * Fetch live tip accounts from the Jito Block Engine.
 * Falls back to the hardcoded list if the request fails.
 */
export async function fetchTipAccounts(blockEngineUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${blockEngineUrl}/api/v1/bundles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTipAccounts",
        params: [],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return JITO_TIP_ACCOUNTS;
    const { result } = await res.json() as { result?: string[] };
    return Array.isArray(result) && result.length > 0 ? result : JITO_TIP_ACCOUNTS;
  } catch {
    return JITO_TIP_ACCOUNTS;
  }
}

/** Recommended tip range in SOL. */
export const TIP_MIN_SOL = 0.001;
export const TIP_MAX_SOL = 0.01;
export const TIP_DEFAULT_SOL = 0.003;
