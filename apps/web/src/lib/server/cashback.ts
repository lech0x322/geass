import "server-only";
import { redis } from "./redis";

export const CASHBACK_RATE = 0.005; // 0.5% of every SOL trade
export const MIN_CLAIM_SOL = 0.05;

export interface CashbackStats {
  unclaimed: number;
  totalClaimed: number;
  tradeCount: number;
  cashbackRate: number;
  minClaimSol: number;
}

export async function getOrInit(wallet: string): Promise<CashbackStats> {
  const data = await redis.hgetall<number>(`cashback:${wallet}`);
  return {
    unclaimed:    Number(data?.unclaimed    ?? 0),
    totalClaimed: Number(data?.totalClaimed ?? 0),
    tradeCount:   Number(data?.tradeCount   ?? 0),
    cashbackRate: CASHBACK_RATE,
    minClaimSol:  MIN_CLAIM_SOL,
  };
}
