/**
 * GEASS subscription plans — single source of truth.
 * Used by the client (useProStatus, UI), the checkout API, and the verify API.
 */

export type PlanId = "scout" | "millioner" | "billionaire";

export interface Plan {
  id:          PlanId;
  name:        string;
  label:       string;        // display label (e.g. "FREE_FOREVER")
  priceSol:    number;        // 0 = free
  durationDays: number;
  color:       string;
  features:    string[];
  locked:      string[];      // features locked (shown greyed out)
}

export const PLANS: Plan[] = [
  {
    id:          "scout",
    name:        "Scout",
    label:       "FREE_FOREVER",
    priceSol:    0,
    durationDays: 0,
    color:       "#5a5a63",
    features: [
      "Home & trending tokens",
      "KOL Feed (limited, view only)",
      "Community",
      "Watchlist (max 5 tokens)",
      "Token Launch on Pump.fun",
      "Marketplace (browse, buy & sell)",
      "Basic profile",
      "Telegram + X login",
    ],
    locked: [
      "Alpha Scanner",
      "Auto-Snipe",
      "Intel & Social Tracker",
      "Predictions",
      "Price Alerts",
      "Portfolio Tracker",
      "Wallet Tracker",
      "AI Trading",
      "Copy Trading",
    ],
  },
  {
    id:          "millioner",
    name:        "Millioner",
    label:       "MILLIONER",
    priceSol:    1,
    durationDays: 30,
    color:       "#8b5cf6",
    features: [
      "Everything in Scout",
      "Alpha Scanner (unlimited)",
      "KOL Feed (full)",
      "Intel & Social Tracker",
      "Predictions",
      "Watchlist (unlimited)",
      "Auto-Snipe (max 0.5 SOL/snipe)",
      "Price Alerts",
      "Portfolio Tracker",
      "Wallet Tracker",
      "Trade History Export",
      "Token Deep Scan",
      "Referral program",
    ],
    locked: [
      "AI Trading (live)",
      "Copy Trading",
      "Custom Webhooks",
      "Bundled Snipe",
      "API Access",
      "Advanced Alerts",
      "Internal Wallet",
    ],
  },
  {
    id:          "billionaire",
    name:        "Billionaire",
    label:       "BILLIONAIRE",
    priceSol:    2.5,
    durationDays: 30,
    color:       "#ff2b4e",
    features: [
      "Everything in Millioner",
      "AI Trading (live)",
      "Auto-Snipe (unlimited)",
      "Copy Trading",
      "Custom Webhooks (Discord/Telegram)",
      "Bundled Snipe",
      "API Access",
      "Advanced Alerts",
      "Internal Wallet",
      "Multi-Wallet Management",
      "Priority Support",
      "Early access to new features",
    ],
    locked: [],
  },
];

export const PLAN_BY_ID: Record<PlanId, Plan> = Object.fromEntries(
  PLANS.map(p => [p.id, p]),
) as Record<PlanId, Plan>;

/** Resolve tier from a lamport amount paid. Returns null if no plan matches (within 10% tolerance). */
export function tierFromLamports(lamports: number): PlanId | null {
  const sol = lamports / 1e9;
  for (const plan of [...PLANS].reverse()) {
    if (plan.priceSol === 0) continue;
    if (sol >= plan.priceSol * 0.9) return plan.id;
  }
  return null;
}

/** Check if a given tier has access to a required tier. creator always passes. */
export function hasAccess(userTier: PlanId | "creator", required: PlanId): boolean {
  if (userTier === "creator") return true;
  const order: PlanId[] = ["scout", "millioner", "billionaire"];
  return order.indexOf(userTier) >= order.indexOf(required);
}
