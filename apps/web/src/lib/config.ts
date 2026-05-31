// Pure client-safe config: no secrets, no API keys.

// Tracked KOL wallets. Live 30d activity (swap count + net SOL) is fetched at
// runtime from /api/kol/stats — these entries hold only stable identity data.
export const KOLS = [
  { name: "Murad",     addr: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", tw: "MustStopMurad", c: "#ef4444" },
  { name: "Hsaka",     addr: "HNF1us7JFyfEm3MEjyNMBSfKUjDuKTnK4VAqMVmdRH6e", tw: "HsakaTrades",   c: "#f97316" },
  { name: "Ansem",     addr: "5tzFkiKscXHK5ZXCGbCe9PSNY2BNoNNsZzMBzuLKkrxM", tw: "blknoiz06",     c: "#eab308" },
  { name: "Cobie",     addr: "2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm", tw: "cobie",         c: "#22c55e" },
  { name: "Gainzy",    addr: "3vefHNMbBPUNnJPpQS3nKRQKAH8K4o8y5TvE3cB3pHKr", tw: "gainzy222",     c: "#a855f7" },
  { name: "Dingaling", addr: "HnCGCGGHk6sVRPpADMGsGqtSHFHpUWQ7sREBRfFNFcLf", tw: "dingalingts",  c: "#ec4899" },
] as const;

export const TIER: Record<string, { l: string; c: string }> = {
  S_TIER: { l: "S",   c: "#10b981" },
  A_TIER: { l: "A",   c: "#3b82f6" },
  B_TIER: { l: "B",   c: "#eab308" },
  C_TIER: { l: "C",   c: "#ef4444" },
  RUGGED: { l: "RUG", c: "#6b7280" },
};

export type NavId = "home" | "trades" | "launch" | "gems" | "referral" | "pro" | "autosnipe" | "settings" | "trending" | "profile" | "community" | "predictions" | "social" | "ai-trading" | "intel" | "watchlist" | "marketplace";

export type NavIconId =
  | "home" | "broadcast" | "flame" | "rocket" | "zap" | "target"
  | "users" | "cog" | "crown" | "user" | "chart" | "globe" | "bot" | "tag";

export type SettingsSection = "sounds" | "referral" | "wallet" | "trading";
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
  /** Show a "Coming Soon" overlay instead of real content. */
  comingSoon?: boolean;
  /** Sidebar section header shown above this item (first item of each group). */
  section?: string;
  /** Sub-items shown when the nav item expands (e.g. Settings). */
  sub?: { id: SettingsSection; label: string }[];
}

export const NAV: NavItem[] = [
  // ── Main ──────────────────────────────────────────────────────────────────
  { id: "home",     label: "Home",         iconId: "home",   mobile: true, section: "MAIN" },

  // ── Trading ───────────────────────────────────────────────────────────────
  { id: "launch",    label: "Launch",        iconId: "rocket",                     section: "TRADING" },
  { id: "gems",      label: "Alpha Scanner", mobileLabel: "Scanner", badge: "PRO", pro: true, iconId: "zap", mobile: true },
  { id: "autosnipe", label: "Auto-Snipe",    iconId: "target", pro: true },
  { id: "watchlist", label: "Watchlist",     iconId: "target" },

  // ── Intelligence ──────────────────────────────────────────────────────────
  { id: "intel",      label: "Intel",          iconId: "zap",       section: "INTEL" },
  { id: "ai-trading", label: "AI Trading",     iconId: "bot" },
  { id: "social",     label: "Social Tracker", iconId: "globe" },

  // ── Community ─────────────────────────────────────────────────────────────
  { id: "marketplace",  label: "Marketplace",  iconId: "tag",   section: "COMMUNITY" },
  { id: "community",    label: "Channel",       iconId: "users" },
  { id: "predictions",  label: "Predictions",   iconId: "chart", comingSoon: true },

  // ── Hidden from sidebar (mobile only / stream) ────────────────────────────
  { id: "trades",  label: "Realtime Trades", mobileLabel: "KOL", badge: "LIVE", iconId: "broadcast", mobile: true, sidebarHidden: true },
  { id: "trending", label: "Trending",       iconId: "flame",   mobile: true, sidebarHidden: true },

  // ── Account ───────────────────────────────────────────────────────────────
  {
    id: "settings", label: "Settings", iconId: "cog", section: "ACCOUNT",
    sub: [
      { id: "sounds",   label: "Sound Alerts" },
      { id: "referral", label: "Rewards" },
      { id: "wallet",   label: "Wallet" },
      { id: "trading",  label: "Trading" },
    ],
  },
  { id: "pro",     label: "GEASS Pro", pro: true, iconId: "crown" },
  { id: "profile", label: "Profile",  mobileLabel: "Me", iconId: "user", mobile: true, mobileOnly: true },
];

export const toB64 = (arr: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
};
