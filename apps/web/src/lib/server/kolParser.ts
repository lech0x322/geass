import "server-only";
import type { FeedTrade } from "../types";
import { KOLS } from "../config";
import { fmtTok } from "../utils";

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
