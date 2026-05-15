// Pure client-safe config: no secrets, no API keys.

export const KOLS = [
  { name: "Murad",     addr: "9BSnmdnbHoVMVFWFxnBnpBFfFLXMSwKjMgCUBv6UFLRV", tw: "MustStopMurad", wr: 71, trades: 1240, pnl: "+$84.2k", c: "#ef4444" },
  { name: "0xSun",     addr: "suqh5haRPBGMPFZHKVRFIoH8zmU5z4vIuEdbHfwJgHk",  tw: "0xSun_sol",     wr: 68, trades: 2100, pnl: "+$61.8k", c: "#f97316" },
  { name: "Ansem",     addr: "5tzFkiKscXHK5ZXCGbCe9PSNY2BNoNNsZzMBzuLKkrxM", tw: "blknoiz06",     wr: 62, trades: 1560, pnl: "+$38.4k", c: "#eab308" },
  { name: "Darkfarms", addr: "AhcuvRMWBDYnRZmMDVMHQCnEfvGnz6BSQB8TgMynUWbS", tw: "darkfarms1",    wr: 74, trades: 3200, pnl: "+$112k",  c: "#22c55e" },
  { name: "KingKong",  addr: "FpCMFDFGYotvufJ7HAsL4tRQGFTHqpSaoH1pCGS9AWHH", tw: "kingkongsol",   wr: 65, trades: 1870, pnl: "+$29.1k", c: "#a855f7" },
  { name: "AlphaBot",  addr: "7mDQhd7n22KBEsGNbQwS88mNqjXFqRmtJHVz4SyZcSxH", tw: "",              wr: 77, trades: 4100, pnl: "+$203k",  c: "#ec4899" },
] as const;

export const TIER: Record<string, { l: string; c: string }> = {
  S_TIER: { l: "S",   c: "#10b981" },
  A_TIER: { l: "A",   c: "#3b82f6" },
  B_TIER: { l: "B",   c: "#eab308" },
  C_TIER: { l: "C",   c: "#ef4444" },
  RUGGED: { l: "RUG", c: "#6b7280" },
};

export interface NavItem {
  id: "gems" | "feed" | "launch";
  icon: string;
  label: string;
  badge?: string;
}

export const NAV: NavItem[] = [
  { id: "gems",   icon: "💎", label: "Gems Detector", badge: "LIVE" },
  { id: "feed",   icon: "⚡", label: "Live Feed" },
  { id: "launch", icon: "🚀", label: "Launch" },
];

export const toB64 = (arr: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
};
