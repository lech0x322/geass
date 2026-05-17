import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

/** Maximum transactions per bundle enforced by Jito. */
export const BUNDLE_MAX_TXS = 5;

export interface BundleSubmitResult {
  bundleId: string;
}

export interface BundleStatus {
  bundleId: string;
  status: "Invalid" | "Pending" | "Failed" | "Landed" | "Unknown";
  slot?: number;
}

/**
 * JitoBundle assembles up to 5 fully-signed VersionedTransactions for atomic submission.
 * All transactions must share the same recent blockhash for the bundle to be valid.
 *
 * Usage:
 *   const bundle = new JitoBundle();
 *   bundle.add(signedCreateTx);
 *   bundle.add(signedBuyTx);  // last tx should include the tip instruction
 *   const id = await client.sendBundle(bundle);
 */
export class JitoBundle {
  private readonly _txs: Uint8Array[] = [];

  /** Add a VersionedTransaction that has already been signed. */
  add(tx: VersionedTransaction): this {
    if (this._txs.length >= BUNDLE_MAX_TXS)
      throw new Error(`JitoBundle: maximum ${BUNDLE_MAX_TXS} transactions per bundle`);
    this._txs.push(tx.serialize());
    return this;
  }

  /** Add a pre-serialized (signed) transaction as raw bytes. */
  addBytes(bytes: Uint8Array): this {
    if (this._txs.length >= BUNDLE_MAX_TXS)
      throw new Error(`JitoBundle: maximum ${BUNDLE_MAX_TXS} transactions per bundle`);
    this._txs.push(bytes);
    return this;
  }

  /** Number of transactions currently in the bundle. */
  get size(): number { return this._txs.length; }

  /** Serialize bundle as an array of base58-encoded transaction strings (Jito wire format). */
  toBase58Array(): string[] {
    return this._txs.map(b => bs58.encode(b));
  }

  /** Raw Uint8Array views of each transaction. */
  toRawArray(): Uint8Array[] {
    return [...this._txs];
  }

  /** Build the JSON-RPC params array expected by `sendBundle`. */
  toRpcParams(): [string[]] {
    return [this.toBase58Array()];
  }
}

/** Deserialize a base58-encoded transaction string back to a VersionedTransaction. */
export function decodeBase58Tx(encoded: string): VersionedTransaction {
  return VersionedTransaction.deserialize(bs58.decode(encoded));
}

/** Encode a serialized transaction to base58. */
export function encodeBase58Tx(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}
