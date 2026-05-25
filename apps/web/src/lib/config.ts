// Pure client-safe config: no secrets, no API keys.

export const KOLS = [
  { name: "Murad",     addr: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", tw: "MustStopMurad", wr: 71, trades: 1240, pnl: "+$84.2k", c: "#ef4444" },
  { name: "Hsaka",     addr: "HNF1us7JFyfEm3MEjyNMBSfKUjDuKTnK4VAqMVmdRH6e", tw: "HsakaTrades",   wr: 68, trades: 2100, pnl: "+$61.8k", c: "#f97316" },
  { name: "Ansem",     addr: "5tzFkiKscXHK5ZXCGbCe9PSNY2BNoNNsZzMBzuLKkrxM", tw: "blknoiz06",     wr: 62, trades: 1560, pnl: "+$38.4k", c: "#eab308" },
  { name: "Cobie",     addr: "2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm", tw: "cobie",         wr: 74, trades: 3200, pnl: "+$112k",  c: "#22c55e" },
  { name: "Gainzy",    addr: "3vefHNMbBPUNnJPpQS3nKRQKAH8K4o8y5TvE3cB3pHKr", tw: "gainzy222",     wr: 65, trades: 1870, pnl: "+$29.1k", c: "#a855f7" },
  { name: "Dingaling", addr: "HnCGCGGHk6sVRPpADMGsGqtSHFHpUWQ7sREBRfFNFcLf", tw: "dingalingts",  wr: 77, trades: 4100, pnl: "+$203k",  c: "#ec4899" },
] as const;

export const TIER: Record<string, { l: string; c: string }> = {
  S_TIER: { l: "S",   c: "#10b981" },
  A_TIER: { l: "A",   c: "#3b82f6" },
  B_TIER: { l: "B",   c: "#eab308" },
  C_TIER: { l: "C",   c: "#ef4444" },
  RUGGED: { l: "RUG", c: "#6b7280" },
};

export type NavId = "home" | "trades" | "launch" | "gems" | "referral" | "pro" | "autosnipe" | "settings" | "trending" | "profile";

export type NavIconId =
  | "home" | "broadcast" | "flame" | "rocket" | "zap" | "target"
  | "users" | "cog" | "crown" | "user";

export type SettingsSection = "sounds" | "referral" | "wallet";
/** Settings sub-items that navigate to a different tab entirely. */
export const SETTINGS_TAB_OVERRIDES: Partial<Record<SettingsSection, NavId>> = {
  referral: "referral",
};

export interface NavItem {
  id: NavId;
  label: string;
  /** Shorter label used in the mobile bottom bar. */
  mobileLabel?: string;
  badge?: string;
  /** Render in Pro purple theme */
  pro?: boolean;
  iconId: NavIconId;
  /** Include in the mobile bottom tab bar. */
  mobile?: boolean;
  /** Only shown in the mobile bottom bar — hidden from the sidebar on all breakpoints. */
  mobileOnly?: boolean;
  /** Hidden from the desktop/sidebar nav — accessible via mobile bottom bar or Home shortcuts. */
  sidebarHidden?: boolean;
  /** Sub-items shown when the nav item expands (e.g. Settings). */
  sub?: { id: SettingsSection; label: string }[];
}

export const NAV: NavItem[] = [
  { id: "home",      label: "Home",                                                         iconId: "home",      mobile: true },
  { id: "trades",    label: "Realtime Trades", mobileLabel: "KOL",     badge: "LIVE",  iconId: "broadcast", mobile: true, sidebarHidden: true },
  { id: "trending",  label: "Trending",                                 badge: "NEW",   iconId: "flame",     mobile: true, sidebarHidden: true },
  { id: "launch",    label: "Launch",                                                    iconId: "rocket",    mobile: true, sidebarHidden: true },
  { id: "gems",      label: "Alpha Scanner",   mobileLabel: "Scanner", badge: "PRO",   pro: true, iconId: "zap",    mobile: true },
  { id: "autosnipe", label: "Auto-Snipe",                               badge: "NEW",   pro: true, iconId: "target" },
  {
    id: "settings",
    label: "Settings",
    iconId: "cog",
    sub: [
      { id: "sounds",   label: "Sound Alerts" },
      { id: "referral", label: "Referral" },
      { id: "wallet",   label: "Wallet" },
    ],
  },
  { id: "pro",     label: "GEASS Pro",                                   pro: true, iconId: "crown" },
  { id: "profile", label: "Profile", mobileLabel: "Me", iconId: "user", mobile: true, mobileOnly: true },
];

export const toB64 = (arr: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
};
