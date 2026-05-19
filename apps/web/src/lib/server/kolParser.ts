import "server-only";
import type { FeedTrade } from "../types";
import { KOLS } from "../config";
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
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
  }>;
  events?: { swap?: SwapEvent };
}

export function parseKolTrade(tx: HeliusTxEnhanced): FeedTrade | null {
  const sig = tx.signature ?? `${Date.now()}-${Math.random()}`;
  const ts = tx.timestamp ? tx.timestamp * 1000 : Date.now();

  // Collect all accounts referenced in this tx
  const accounts = new Set<string>();
  tx.nativeTransfers?.forEach(t => { accounts.add(t.fromUserAccount); accounts.add(t.toUserAccount); });
  tx.tokenTransfers?.forEach(t => { accounts.add(t.fromUserAccount); accounts.add(t.toUserAccount); });
  tx.accountData?.forEach(a => { accounts.add(a.account); });

  const kol = KOLS.find(k => accounts.has(k.addr));
  if (!kol) return null;

  const swap = tx.events?.swap;
  if (swap) {
    const kolIsBuyer =
      swap.nativeInput?.account === kol.addr ||
      swap.tokenOutputs?.some(t => t.userAccount === kol.addr);

    const solLamports = kolIsBuyer
      ? swap.nativeInput?.amount ?? 0
      : swap.nativeOutput?.amount ?? 0;
    const solAmt = (solLamports / 1e9).toFixed(3);

    const tokenSide = kolIsBuyer ? swap.tokenOutputs?.[0] : swap.tokenInputs?.[0];
    const mint = tokenSide?.mint ?? "";
    const tokRaw = Number(tokenSide?.rawTokenAmount?.tokenAmount ?? 0);

    if (!mint || solLamports === 0) return null;

    return {
      id: sig,
      kol: kol.name,
      kolC: kol.c,
      type: kolIsBuyer ? "buy" : "sell",
      sym: mint.slice(0, 6).toUpperCase(),
      sol: solAmt,
      tokAmt: fmtTok(tokRaw),
      ago: 0,
      ts,
      mint,
    };
  }

  // Fallback: look for a native transfer where KOL sends/receives SOL alongside a token transfer
  const native = tx.nativeTransfers?.find(
    t => t.fromUserAccount === kol.addr || t.toUserAccount === kol.addr,
  );
  const token = tx.tokenTransfers?.[0];
  if (!native || !token) return null;

  const isBuy = native.fromUserAccount === kol.addr;
  return {
    id: sig,
    kol: kol.name,
    kolC: kol.c,
    type: isBuy ? "buy" : "sell",
    sym: token.mint.slice(0, 6).toUpperCase(),
    sol: (native.amount / 1e9).toFixed(3),
    tokAmt: fmtTok(token.tokenAmount),
    ago: 0,
    ts,
    mint: token.mint,
  };
}

/**
 * Extract the trader wallet + swap details from any pump.fun tx,
 * regardless of whether the wallet is in the hardcoded KOLS list.
 * Returns null if the tx isn't a pump.fun user swap.
 */
export function extractPumpTrade(tx: HeliusTxEnhanced): PumpTradeEvent | null {
  const swap = tx.events?.swap;
  if (!swap) return null;

  // Identify the user (buyer or seller) — the non-program wallet on the native side.
  const buyer = swap.nativeInput?.account;
  const seller = swap.nativeOutput?.account;
  const userAddr = buyer ?? seller;
  if (!userAddr || userAddr === PUMP_PROGRAM) return null;

  const side: "buy" | "sell" = buyer ? "buy" : "sell";
  const solLamports = side === "buy"
    ? swap.nativeInput?.amount ?? 0
    : swap.nativeOutput?.amount ?? 0;
  if (solLamports === 0) return null;

  const tokenSide = side === "buy" ? swap.tokenOutputs?.[0] : swap.tokenInputs?.[0];
  const mint = tokenSide?.mint;
  if (!mint) return null;

  const tokenAmount = Number(tokenSide?.rawTokenAmount?.tokenAmount ?? 0);

  return {
    wallet: userAddr,
    mint,
    side,
    solAmount: solLamports / 1e9,
    tokenAmount,
    ts: tx.timestamp ? tx.timestamp * 1000 : Date.now(),
  };
}

/** Build a FeedTrade entry from a dynamically-detected smart wallet trade. */
export function smartWalletToFeedTrade(
  ev: PumpTradeEvent,
  sig: string,
): FeedTrade {
  return {
    id: sig,
    kol: shortAddr(ev.wallet),
    kolC: colorForAddr(ev.wallet),
    type: ev.side,
    sym: ev.mint.slice(0, 6).toUpperCase(),
    sol: ev.solAmount.toFixed(3),
    tokAmt: fmtTok(ev.tokenAmount),
    ago: 0,
    ts: ev.ts,
    mint: ev.mint,
  };
}
