export interface TradeRecord {
  id: string;
  wallet: string;
  mint: string;
  symbol: string;
  side: "buy" | "sell";
  amountToken: number;
  amountSol: number;
  priceUsd: number;
  signature: string;
  timestamp: number;
}

export interface TradePnL {
  mint: string;
  symbol: string;
  totalBoughtSol: number;
  totalSoldSol: number;
  remainingTokens: number;
  realizedPnlSol: number;
  realizedPnlUsd: number;
  unrealizedPnlSol: number | null; // null if price unknown
  currentPriceUsd: number | null;
}
