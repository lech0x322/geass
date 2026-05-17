import "server-only";
import type { FeedTrade } from "../types";

type Listener = (trade: FeedTrade) => void;
const listeners = new Set<Listener>();
const recentTrades: FeedTrade[] = [];
const MAX_RECENT = 200;

export function publishKolTrade(trade: FeedTrade): void {
  recentTrades.unshift(trade);
  if (recentTrades.length > MAX_RECENT) recentTrades.pop();
  listeners.forEach(fn => { try { fn(trade); } catch {} });
}

export function subscribeKolFeed(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getRecentTrades(): FeedTrade[] {
  return [...recentTrades];
}
