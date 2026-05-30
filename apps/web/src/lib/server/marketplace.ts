import "server-only";
import { redis } from "./redis";

export type ListingCategory = "launch" | "promotion" | "design" | "technical" | "alpha" | "audit" | "other";
export type ListingStatus   = "active" | "sold" | "cancelled";

export interface ListingReview {
  id:             string;
  reviewer:       string;
  reviewerAlias:  string;
  rating:         1 | 2 | 3 | 4 | 5;
  comment:        string;
  createdAt:      number;
}

export interface Listing {
  id:              string;
  seller:          string;
  sellerAlias:     string;
  title:           string;
  description:     string;
  category:        ListingCategory;
  price:           number;        // SOL — 0 means "contact for price"
  priceNegotiable: boolean;
  deliveryTime:    string;
  contactMethod:   "telegram" | "discord" | "dm";
  contactHandle?:  string;
  emoji:           string;
  tags:            string[];
  createdAt:       number;
  updatedAt:       number;
  status:          ListingStatus;
  views:           number;
  reviews:         ListingReview[];
}

// ── Persistence ───────────────────────────────────────────────────────────────

const KEY_IDS = "marketplace:ids";
function KEY(id: string) { return `marketplace:${id}`; }
const TTL = 90 * 24 * 3600; // 90 days

const cache = new Map<string, Listing>();

async function persist(l: Listing): Promise<void> {
  cache.set(l.id, l);
  await redis.set(KEY(l.id), l, TTL);
  const ids = (await redis.get<string[]>(KEY_IDS)) ?? [];
  if (!ids.includes(l.id)) {
    ids.push(l.id);
    await redis.set(KEY_IDS, ids, TTL);
  }
}

async function load(id: string): Promise<Listing | null> {
  if (cache.has(id)) return cache.get(id)!;
  const stored = await redis.get<Listing>(KEY(id));
  if (stored) { cache.set(id, stored); return stored; }
  return null;
}

function genId(): string {
  return `lst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

let seeded = false;
async function seedIfEmpty(): Promise<void> {
  if (seeded) return;
  seeded = true;
  const existingIds = await redis.get<string[]>(KEY_IDS);
  if (existingIds && existingIds.length > 0) {
    for (const id of existingIds) await load(id);
    return;
  }

  const now = Date.now();
  const demos: Omit<Listing, "views" | "reviews">[] = [
    {
      id: genId(), seller: "GEASS", sellerAlias: "GEASS",
      title: "Full Token Launch Package — pump.fun + Raydium LP",
      description: "Complete launch from zero: create token + metadata IPFS upload, deploy on pump.fun, migrate to Raydium with custom LP size, Jito bundle for anti-bot first buy. 24h post-launch support included.",
      category: "launch", price: 0.5, priceNegotiable: false,
      deliveryTime: "12h", contactMethod: "telegram", contactHandle: "@geass_launch",
      emoji: "🚀", tags: ["launch", "pump.fun", "raydium", "LP", "jito"],
      createdAt: now - 3 * 86400000, updatedAt: now - 3 * 86400000, status: "active",
    },
    {
      id: genId(), seller: "GEASS", sellerAlias: "GEASS",
      title: "KOL Call Package — 3 Tier-1 Callers",
      description: "Coordinated call from 3 verified KOL wallets with active Solana following. Includes Twitter Space + 2 video calls. Timing synced with your buy wall. Proof of past calls and wallet history available.",
      category: "promotion", price: 2.0, priceNegotiable: true,
      deliveryTime: "48h", contactMethod: "telegram", contactHandle: "@geass_kol",
      emoji: "📣", tags: ["kol", "call", "promotion", "twitter", "spaces"],
      createdAt: now - 1 * 86400000, updatedAt: now - 1 * 86400000, status: "active",
    },
    {
      id: genId(), seller: "GEASS", sellerAlias: "GEASS",
      title: "Meme Package — Logo + Banner + 10 Memes",
      description: "Professional meme coin branding: custom logo, Twitter/Telegram banner, 10 viral-style memes tailored to your narrative. Fast delivery, unlimited revisions on logo. Works for any theme or trend.",
      category: "design", price: 0.15, priceNegotiable: false,
      deliveryTime: "24h", contactMethod: "discord", contactHandle: "geass#0001",
      emoji: "🎨", tags: ["logo", "memes", "branding", "art", "design"],
      createdAt: now - 2 * 86400000, updatedAt: now - 2 * 86400000, status: "active",
    },
    {
      id: genId(), seller: "GEASS", sellerAlias: "GEASS",
      title: "Alpha Group Access — Monthly Subscription",
      description: "Private signal group: 200+ members, 3–5 high-conviction calls/week, pre-launch access to new tokens, on-chain whale movement alerts. 30-day history available on request before subscribing.",
      category: "alpha", price: 0.3, priceNegotiable: false,
      deliveryTime: "instant", contactMethod: "telegram", contactHandle: "@geass_alpha",
      emoji: "💡", tags: ["alpha", "signals", "subscription", "calls", "monthly"],
      createdAt: now - 5 * 86400000, updatedAt: now - 5 * 86400000, status: "active",
    },
    {
      id: genId(), seller: "GEASS", sellerAlias: "GEASS",
      title: "Jito Bundle + Anti-Rug Sniper Config",
      description: "Custom Jito bundle configuration for max priority + MEV protection. Includes auto-sniper setup: configurable buy limits, slippage, stop-loss triggers, retry logic. Source code + walkthrough included.",
      category: "technical", price: 0.8, priceNegotiable: false,
      deliveryTime: "24h", contactMethod: "telegram", contactHandle: "@geass_tech",
      emoji: "⚙️", tags: ["jito", "sniper", "mev", "bundle", "bot"],
      createdAt: now - 4 * 86400000, updatedAt: now - 4 * 86400000, status: "active",
    },
    {
      id: genId(), seller: "GEASS", sellerAlias: "GEASS",
      title: "Token Safety Audit — On-Chain Analysis",
      description: "Full token audit: mint authority check, freeze authority, LP lock status, top holder concentration, honeypot simulation, DEX listing verification. Verified badge + detailed PDF report.",
      category: "audit", price: 0.1, priceNegotiable: false,
      deliveryTime: "6h", contactMethod: "telegram", contactHandle: "@geass_audit",
      emoji: "🔒", tags: ["audit", "security", "safe", "verified", "report"],
      createdAt: now - 6 * 86400000, updatedAt: now - 6 * 86400000, status: "active",
    },
  ];

  for (const d of demos) {
    await persist({ ...d, views: Math.floor(Math.random() * 80) + 10, reviews: [] });
  }
}

seedIfEmpty().catch(() => {});

// ── Public API ────────────────────────────────────────────────────────────────

export async function listListings(opts?: {
  category?: ListingCategory;
  search?: string;
  seller?: string;
}): Promise<Listing[]> {
  const ids = (await redis.get<string[]>(KEY_IDS)) ?? [...cache.keys()];
  const all = await Promise.all(ids.map(id => load(id)));
  return (all.filter(Boolean) as Listing[])
    .filter(l => l.status === "active")
    .filter(l => !opts?.category || l.category === opts.category)
    .filter(l => !opts?.seller  || l.seller  === opts.seller)
    .filter(l => !opts?.search  ||
      l.title.toLowerCase().includes(opts.search!.toLowerCase()) ||
      l.description.toLowerCase().includes(opts.search!.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getListing(id: string): Promise<Listing | null> {
  return load(id);
}

export interface CreateListingInput {
  seller:          string;
  sellerAlias:     string;
  title:           string;
  description:     string;
  category:        ListingCategory;
  price:           number;
  priceNegotiable: boolean;
  deliveryTime:    string;
  contactMethod:   "telegram" | "discord" | "dm";
  contactHandle?:  string;
  emoji:           string;
  tags:            string[];
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const now = Date.now();
  const l: Listing = {
    id:              genId(),
    seller:          input.seller,
    sellerAlias:     input.sellerAlias.slice(0, 24),
    title:           input.title.slice(0, 80),
    description:     input.description.slice(0, 1000),
    category:        input.category,
    price:           Math.max(0, Math.min(100, input.price)),
    priceNegotiable: input.priceNegotiable,
    deliveryTime:    input.deliveryTime.slice(0, 20),
    contactMethod:   input.contactMethod,
    contactHandle:   input.contactHandle?.slice(0, 50),
    emoji:           input.emoji.slice(0, 4),
    tags:            input.tags.slice(0, 8).map(t => t.slice(0, 20)),
    createdAt:       now,
    updatedAt:       now,
    status:          "active",
    views:           0,
    reviews:         [],
  };
  await persist(l);
  return l;
}

export interface UpdateListingInput {
  title?:           string;
  description?:     string;
  price?:           number;
  priceNegotiable?: boolean;
  deliveryTime?:    string;
  contactHandle?:   string;
  tags?:            string[];
  status?:          ListingStatus;
}

export async function updateListing(id: string, wallet: string, updates: UpdateListingInput): Promise<{ ok: boolean; error?: string }> {
  const l = await load(id);
  if (!l) return { ok: false, error: "Not found" };
  if (l.seller !== wallet) return { ok: false, error: "Not authorized" };
  if (updates.title           !== undefined) l.title           = updates.title.slice(0, 80);
  if (updates.description     !== undefined) l.description     = updates.description.slice(0, 1000);
  if (updates.price           !== undefined) l.price           = Math.max(0, Math.min(100, updates.price));
  if (updates.priceNegotiable !== undefined) l.priceNegotiable = updates.priceNegotiable;
  if (updates.deliveryTime    !== undefined) l.deliveryTime    = updates.deliveryTime.slice(0, 20);
  if (updates.contactHandle   !== undefined) l.contactHandle   = updates.contactHandle.slice(0, 50);
  if (updates.tags            !== undefined) l.tags            = updates.tags.slice(0, 8).map(t => t.slice(0, 20));
  if (updates.status          !== undefined) l.status          = updates.status;
  l.updatedAt = Date.now();
  await persist(l);
  return { ok: true };
}

export async function incrementView(id: string): Promise<void> {
  const l = await load(id);
  if (!l) return;
  l.views++;
  await persist(l);
}

export async function addReview(
  id: string,
  reviewer: string,
  reviewerAlias: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; error?: string }> {
  const l = await load(id);
  if (!l) return { ok: false, error: "Not found" };
  if (l.seller === reviewer) return { ok: false, error: "Cannot review your own listing" };
  if (l.reviews.some(r => r.reviewer === reviewer)) return { ok: false, error: "Already reviewed" };
  const review: ListingReview = {
    id:            `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reviewer,
    reviewerAlias: reviewerAlias.slice(0, 24),
    rating:        Math.max(1, Math.min(5, Math.round(rating))) as 1 | 2 | 3 | 4 | 5,
    comment:       comment.slice(0, 300),
    createdAt:     Date.now(),
  };
  l.reviews.push(review);
  l.updatedAt = Date.now();
  await persist(l);
  return { ok: true };
}
