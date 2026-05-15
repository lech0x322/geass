import "server-only";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "node:buffer";
import { heliusRpc } from "./helius";
import { cached } from "./cache";
import { PUMP_PROG } from "../env";

const PUMP_PROG_PK = new PublicKey(PUMP_PROG);

// Constants from the pump.fun program. These match what the pump.fun
// frontend uses to compute the bonding-curve progress bar.
// Token has 6 decimals on Solana, supply units below are in raw integer.
const INITIAL_REAL_TOKEN_RESERVES = 793_100_000n * 1_000_000n; // 793.1M tokens
const LAMPORTS_PER_SOL = 1_000_000_000n;

export interface BondingCurveState {
  bondingCurve: string;
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  realSolReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  /** Progress in [0, 100], computed from the real token reserve burn. */
  progress: number;
  /** SOL collected so far in the curve (UI-friendly number). */
  solCollected: number;
}

export function bondingCurvePDA(mint: string): string {
  const mintPk = new PublicKey(mint);
  const [bc] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mintPk.toBuffer()],
    PUMP_PROG_PK,
  );
  return bc.toBase58();
}

function parseBondingCurveBytes(buf: Buffer): Omit<BondingCurveState, "bondingCurve" | "progress" | "solCollected"> | null {
  // Anchor account: 8-byte discriminator + 5 × u64 + bool
  if (buf.length < 8 + 5 * 8 + 1) return null;
  let o = 8;
  const u64 = () => {
    const v = buf.readBigUInt64LE(o);
    o += 8;
    return v;
  };
  const virtualTokenReserves = u64();
  const virtualSolReserves = u64();
  const realTokenReserves = u64();
  const realSolReserves = u64();
  const tokenTotalSupply = u64();
  const complete = buf.readUInt8(o) === 1;
  return { virtualTokenReserves, virtualSolReserves, realTokenReserves, realSolReserves, tokenTotalSupply, complete };
}

interface AccountInfoBase64 {
  value: {
    data: [string, "base64"];
    owner: string;
    executable: boolean;
    lamports: number;
    rentEpoch: number;
  } | null;
}

async function fetchBondingCurveUncached(mint: string): Promise<BondingCurveState | null> {
  let bondingCurve: string;
  try {
    bondingCurve = bondingCurvePDA(mint);
  } catch {
    return null; // invalid mint pubkey
  }

  let info: AccountInfoBase64;
  try {
    info = await heliusRpc<AccountInfoBase64>("getAccountInfo", [
      bondingCurve,
      { encoding: "base64" },
    ]);
  } catch {
    return null;
  }
  if (!info?.value?.data) return null;

  const [b64] = info.value.data;
  const buf = Buffer.from(b64, "base64");
  const parsed = parseBondingCurveBytes(buf);
  if (!parsed) return null;

  // Progress: fraction of the available real token supply that has been sold.
  // (1 - reserveLeft / initialReserve) × 100
  let progress = 0;
  if (INITIAL_REAL_TOKEN_RESERVES > 0n) {
    const sold = INITIAL_REAL_TOKEN_RESERVES > parsed.realTokenReserves
      ? INITIAL_REAL_TOKEN_RESERVES - parsed.realTokenReserves
      : 0n;
    progress = Number((sold * 10000n) / INITIAL_REAL_TOKEN_RESERVES) / 100;
  }
  if (parsed.complete) progress = 100;

  return {
    bondingCurve,
    ...parsed,
    progress: Math.max(0, Math.min(100, progress)),
    solCollected: Number(parsed.realSolReserves) / Number(LAMPORTS_PER_SOL),
  };
}

export function fetchBondingCurve(mint: string): Promise<BondingCurveState | null> {
  return cached(`bc:${mint}`, 8_000, () => fetchBondingCurveUncached(mint));
}
