import "server-only";
import type { FeedTrade } from "../types";
import { KOL_WALLETS, MIN_BUY_SOL, MIN_SELL_SOL } from "./kol";
import { fmtTok, shortAddr } from "../utils";
import { colorForAddr, PUMP_PROGRAM, type PumpTradeEvent } from "./smartWallets";

interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  mint: string;
  tokenAmount: number;
}

interface SwapEvent {
  nativeInput?: { account: string; amount: number };
  nativeOutput?: { account: string; amount: number };
  tokenInputs?: Array<{ userAccount: string; mint: string; rawTokenAmount: { tokenAmount: string } }>;
  tokenOutputs?: Array<{ userAccount: string; mint: string; rawTokenAmount: { tokenAmount: string } }>;
}

export interface HeliusTxEnhanced {
  signature?: string;
  type?: string;
  timestamp?: number;
  nativeTransfers?: NativeTransfer[];
  tokenTransfers?: TokenTransfer[];
  accountData?: Array<{ account: string; nativeBalanceChange: number }>;
  events?: { swap?: SwapEvent };
}

export function parseKolTrade(tx: HeliusTxEnhanced): FeedTrade | null {
  const sig = tx.signature ?? `${Date.now()}-${Math.random()}`;
  const ts  = tx.timestamp ? tx.timestamp * 1000 : Date.now();

  // Find which KOL wallet is involved in this tx
  const accounts = new Set<string>();
  tx.nativeTransfers?.forEach(t => { accounts.add(t.fromUserAccount); accounts.add(t.toUserAccount); });
  tx.tokenTransfers?.forEach(t => { accounts.add(t.fromUserAccount); accounts.add(t.toUserAccount); });
  tx.accountData?.forEach(a => { accounts.add(a.account); });

  let kolAddr: string | undefined;
  let kolEntry: ReturnType<typeof KOL_WALLETS.get>;
  for (const addr of accounts) {
    const entry = KOL_WALLETS.get(addr);
    if (entry) { kolAddr = addr; kolEntry = entry; break; }
  }
  if (!kolAddr || !kolEntry) return null;

  const swap = tx.events?.swap;
  if (swap) {
    const isBuy =
      swap.nativeInput?.account === kolAddr ||
      swap.tokenOutputs?.some(t => t.userAccount === kolAddr);

    const solLamports = isBuy
      ? (swap.nativeInput?.amount ?? 0)
      : (swap.nativeOutput?.amount ?? 0);
    const solAmt = solLamports / 1e9;

    // Apply SOL thresholds
    if (isBuy  && solAmt < MIN_BUY_SOL)  return null;
    if (!isBuy && solAmt < MIN_SELL_SOL) return null;

    const tokenSide = isBuy ? swap.tokenOutputs?.[0] : swap.tokenInputs?.[0];
    const mint = tokenSide?.mint ?? "";
    const tokRaw = Number(tokenSide?.rawTokenAmount?.tokenAmount ?? 0);

    if (!mint || solLamports === 0) return null;

    return {
      id:     sig,
      kol:    kolEntry.label,
      kolC:   kolEntry.c,
      type:   isBuy ? "buy" : "sell",
      sym:    mint.slice(0, 6).toUpperCase(),
      sol:    solAmt.toFixed(3),
      tokAmt: fmtTok(tokRaw),
      ago:    0,
      ts,
      mint,
    };
  }

  // Fallback: native SOL transfer + token transfer
  const native = tx.nativeTransfers?.find(
    t => t.fromUserAccount === kolAddr || t.toUserAccount === kolAddr,
  );
  const token = tx.tokenTransfers?.[0];
  if (!native || !token) return null;

  const isBuy = native.fromUserAccount === kolAddr;
  const solAmt = native.amount / 1e9;
  if (isBuy  && solAmt < MIN_BUY_SOL)  return null;
  if (!isBuy && solAmt < MIN_SELL_SOL) return null;

  return {
    id:     sig,
    kol:    kolEntry.label,
    kolC:   kolEntry.c,
    type:   isBuy ? "buy" : "sell",
    sym:    token.mint.slice(0, 6).toUpperCase(),
    sol:    solAmt.toFixed(3),
    tokAmt: fmtTok(token.tokenAmount),
    ago:    0,
    ts,
    mint:   token.mint,
  };
}

export function extractPumpTrade(tx: HeliusTxEnhanced): PumpTradeEvent | null {
  const swap = tx.events?.swap;
  if (!swap) return null;

  const buyer  = swap.nativeInput?.account;
  const seller = swap.nativeOutput?.account;
  const userAddr = buyer ?? seller;
  if (!userAddr || userAddr === PUMP_PROGRAM) return null;

  const side: "buy" | "sell" = buyer ? "buy" : "sell";
  const solLamports = side === "buy"
    ? (swap.nativeInput?.amount ?? 0)
    : (swap.nativeOutput?.amount ?? 0);
  if (solLamports === 0) return null;

  const tokenSide = side === "buy" ? swap.tokenOutputs?.[0] : swap.tokenInputs?.[0];
  const mint = tokenSide?.mint;
  if (!mint) return null;

  return {
    wallet:      userAddr,
    mint,
    side,
    solAmount:   solLamports / 1e9,
    tokenAmount: Number(tokenSide?.rawTokenAmount?.tokenAmount ?? 0),
    ts:          tx.timestamp ? tx.timestamp * 1000 : Date.now(),
  };
}

export function smartWalletToFeedTrade(ev: PumpTradeEvent, sig: string): FeedTrade {
  return {
    id:     sig,
    kol:    shortAddr(ev.wallet),
    kolC:   colorForAddr(ev.wallet),
    type:   ev.side,
    sym:    ev.mint.slice(0, 6).toUpperCase(),
    sol:    ev.solAmount.toFixed(3),
    tokAmt: fmtTok(ev.tokenAmount),
    ago:    0,
    ts:     ev.ts,
    mint:   ev.mint,
  };
}
