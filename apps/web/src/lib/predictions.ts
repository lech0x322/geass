import {
  PublicKey, Transaction, TransactionInstruction,
  SystemProgram, Connection, LAMPORTS_PER_SOL,
} from "@solana/web3.js";

export const PREDICTIONS_PROGRAM_ID = new PublicKey(
  "BwjuHiMenCuF45T82rMerzeqgbVQLqrKyxmb5pyBD4xm"
);

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

// Anchor instruction discriminators: sha256("global:<name>")[0:8]
const DISC = {
  create_market:  Buffer.from([103, 226,  97, 235, 200, 188, 251, 254]),
  place_bet:      Buffer.from([222,  62,  67, 220,  63, 166, 126,  33]),
  resolve_market: Buffer.from([155,  23,  80, 173,  46,  74,  23, 239]),
  claim_winnings: Buffer.from([161, 215,  24,  59,  14, 236, 242, 221]),
};

// Tiny borsh helpers — only the types the program uses
function encodeU8(v: number)  { const b = Buffer.alloc(1); b.writeUInt8(v, 0);         return b; }
function encodeU64(v: bigint) { const b = Buffer.alloc(8); b.writeBigUInt64LE(v, 0);   return b; }
function encodeI64(v: bigint) { const b = Buffer.alloc(8); b.writeBigInt64LE(v, 0);    return b; }
function encodeStr(s: string) {
  const str = Buffer.from(s, "utf8");
  const len = Buffer.alloc(4); len.writeUInt32LE(str.length, 0);
  return Buffer.concat([len, str]);
}

// ─── PDA helpers ──────────────────────────────────────────────────────────────
export function marketPda(creator: PublicKey, marketId: bigint): [PublicKey, number] {
  const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(marketId, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), creator.toBuffer(), idBuf],
    PREDICTIONS_PROGRAM_ID,
  );
}

export function positionPda(market: PublicKey, user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), market.toBuffer(), user.toBuffer()],
    PREDICTIONS_PROGRAM_ID,
  );
}

// ─── Instruction builders ─────────────────────────────────────────────────────
export function buildCreateMarket(
  creator: PublicKey, marketPdaKey: PublicKey,
  marketId: bigint, question: string, outcomeA: string, outcomeB: string, resolutionTs: bigint,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PREDICTIONS_PROGRAM_ID,
    keys: [
      { pubkey: marketPdaKey,            isSigner: false, isWritable: true  },
      { pubkey: creator,                 isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([DISC.create_market, encodeU64(marketId), encodeStr(question), encodeStr(outcomeA), encodeStr(outcomeB), encodeI64(resolutionTs)]),
  });
}

export function buildPlaceBet(
  user: PublicKey, marketPdaKey: PublicKey, positionPdaKey: PublicKey,
  outcome: 0 | 1, amountLamports: bigint,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PREDICTIONS_PROGRAM_ID,
    keys: [
      { pubkey: marketPdaKey,            isSigner: false, isWritable: true  },
      { pubkey: positionPdaKey,          isSigner: false, isWritable: true  },
      { pubkey: user,                    isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([DISC.place_bet, encodeU8(outcome), encodeU64(amountLamports)]),
  });
}

export function buildResolveMarket(
  creator: PublicKey, marketPdaKey: PublicKey, winningOutcome: 0 | 1 | 2,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PREDICTIONS_PROGRAM_ID,
    keys: [
      { pubkey: marketPdaKey, isSigner: false, isWritable: true  },
      { pubkey: creator,      isSigner: true,  isWritable: false },
    ],
    data: Buffer.concat([DISC.resolve_market, encodeU8(winningOutcome)]),
  });
}

export function buildClaimWinnings(
  user: PublicKey, marketPdaKey: PublicKey, positionPdaKey: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PREDICTIONS_PROGRAM_ID,
    keys: [
      { pubkey: marketPdaKey,   isSigner: false, isWritable: true },
      { pubkey: positionPdaKey, isSigner: false, isWritable: true },
      { pubkey: user,           isSigner: true,  isWritable: true },
    ],
    data: Buffer.concat([DISC.claim_winnings]),
  });
}

// ─── On-chain account types ───────────────────────────────────────────────────
export interface MarketAccount {
  address:        string;
  creator:        string;
  question:       string;
  outcomeA:       string;
  outcomeB:       string;
  resolutionTs:   number;
  totalA:         number; // SOL
  totalB:         number; // SOL
  resolved:       boolean;
  winningOutcome: number; // 0=A,1=B,2=void,255=unresolved
  marketId:       string;
}

export interface PositionAccount {
  market: string; user: string; outcome: number; amount: number; claimed: boolean;
}

function readStr(buf: Buffer, off: number): [string, number] {
  const len = buf.readUInt32LE(off);
  return [buf.slice(off + 4, off + 4 + len).toString("utf8"), off + 4 + len];
}

export function decodeMarket(data: Buffer, address: string): MarketAccount | null {
  try {
    let o = 8;
    const creator = new PublicKey(data.slice(o, o + 32)).toBase58(); o += 32;
    let question: string, outcomeA: string, outcomeB: string;
    [question, o] = readStr(data, o);
    [outcomeA,  o] = readStr(data, o);
    [outcomeB,  o] = readStr(data, o);
    const resolutionTs   = Number(data.readBigInt64LE(o));  o += 8;
    const totalALamports = Number(data.readBigUInt64LE(o)); o += 8;
    const totalBLamports = Number(data.readBigUInt64LE(o)); o += 8;
    const resolved       = data.readUInt8(o) !== 0;         o += 1;
    const winningOutcome = data.readUInt8(o);               o += 1;
    const marketId       = data.readBigUInt64LE(o).toString();
    return {
      address, creator, question, outcomeA, outcomeB,
      resolutionTs, resolved, winningOutcome, marketId,
      totalA: totalALamports / LAMPORTS_PER_SOL,
      totalB: totalBLamports / LAMPORTS_PER_SOL,
    };
  } catch { return null; }
}

export function decodePosition(data: Buffer): PositionAccount | null {
  try {
    let o = 8;
    const market  = new PublicKey(data.slice(o, o + 32)).toBase58(); o += 32;
    const user    = new PublicKey(data.slice(o, o + 32)).toBase58(); o += 32;
    const outcome = data.readUInt8(o); o += 1;
    const amount  = Number(data.readBigUInt64LE(o)) / LAMPORTS_PER_SOL; o += 8;
    const claimed = data.readUInt8(o) !== 0;
    return { market, user, outcome, amount, claimed };
  } catch { return null; }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
export async function fetchAllMarkets(): Promise<MarketAccount[]> {
  const conn = new Connection(RPC_ENDPOINT, "confirmed");
  try {
    const accounts = await conn.getProgramAccounts(PREDICTIONS_PROGRAM_ID, {
      // Market SPACE = 8+32+(4+200)+(4+60)+(4+60)+8+8+8+1+1+8+1 = 407
      filters: [{ dataSize: 407 }],
    });
    return accounts
      .map(a => decodeMarket(Buffer.from(a.account.data), a.pubkey.toBase58()))
      .filter((m): m is MarketAccount => m !== null)
      .sort((a, b) => b.resolutionTs - a.resolutionTs);
  } catch { return []; }
}

export async function fetchUserPosition(market: PublicKey, user: PublicKey): Promise<PositionAccount | null> {
  const [posPda] = positionPda(market, user);
  const conn = new Connection(RPC_ENDPOINT, "confirmed");
  try {
    const acct = await conn.getAccountInfo(posPda);
    if (!acct) return null;
    return decodePosition(Buffer.from(acct.data));
  } catch { return null; }
}

// ─── Phantom transaction sender ───────────────────────────────────────────────
type PhantomWindow = Window & {
  solana?: { signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> };
};

export async function sendWithPhantom(ix: TransactionInstruction, walletAddress: string): Promise<string> {
  const ph = (window as PhantomWindow).solana;
  if (!ph) throw new Error("Phantom not found");
  const conn = new Connection(RPC_ENDPOINT, "confirmed");
  const { blockhash } = await conn.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(walletAddress) });
  tx.add(ix);
  const { signature } = await ph.signAndSendTransaction(tx);
  await conn.confirmTransaction(signature, "confirmed");
  return signature;
}
