export interface TpSlRule {
  id: string;
  wallet: string;
  mint: string;
  symbol: string;
  entryPrice: number;           // USD at time of setting rule
  takeProfitPct: number | null; // e.g. 200 = sell at +200%
  stopLossPct: number | null;   // e.g. 30 = sell if -30%
  amountPct: number;            // % of holdings to sell (1-100)
  active: boolean;
  createdAt: number;
  triggeredAt: number | null;
  triggeredType: "tp" | "sl" | null;
}
