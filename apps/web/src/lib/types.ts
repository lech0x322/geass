export type Tier = "S_TIER" | "A_TIER" | "B_TIER" | "C_TIER" | "RUGGED";

export interface KolBuyer {
  l?: string;
  label?: string;
  s?: number;
  solAmount?: number;
}

export interface Gem {
  id: string;
  sym: string;
  name: string;
  score: number;
  tier: Tier;
  mcap: number;
  priceSol: number;
  vol24h: number;
  bc: number;
  kol: number;
  kolBuyers: KolBuyer[];
  holders: number;
  ageHours: number | null;
  xPotential: number;
  priceChange1h: number;
  buyPressure: number;
  contractAddress: string;
  reasons: string[];
  redFlags: string[];
  mintRev: boolean;
  freezeRev: boolean;
  /** Pump.fun status if the token is still on the bonding curve. */
  bondingCurve?: {
    progress: number;        // 0-100
    solCollected: number;    // SOL units
    complete: boolean;       // graduated to Raydium
  } | null;
  source: "helius" | "dex" | "ai" | "stream";
  dexUrl: string | null;
  detectedAt: string;
}

export interface FeedTrade {
  id: string;
  kol: string;
  kolC: string;
  type: "buy" | "sell";
  sym: string;
  sol: string;
  tokAmt: string;
  ago: number;
  ts?: number;   // ms since epoch
  mint?: string; // token mint address
}
