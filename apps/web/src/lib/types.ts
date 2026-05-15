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
  source: "helius" | "dex" | "ai" | "stream";
  dexUrl: string | null;
  detectedAt: string;
}

export interface FeedTrade {
  id: number;
  kol: string;
  kolC: string;
  type: "buy" | "sell";
  sym: string;
  sol: string;
  tokAmt: string;
  ago: number;
}
