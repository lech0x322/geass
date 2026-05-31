import "server-only";
import { redis } from "./redis";
import { CREATOR_USERNAMES, getProfile } from "./profile";

async function isCreatorWallet(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  const profile = await getProfile(wallet);
  return !!profile && CREATOR_USERNAMES.some(u => u.toLowerCase() === profile.username.toLowerCase());
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CommunityPost {
  id:          string;
  author:      string;
  authorAlias: string;
  authorEmoji: string;
  text:        string;
  type:        "text" | "call" | "buy";
  tokenMint?:  string;
  tokenSym?:   string;
  createdAt:   number;
  reactions:   { fire: number; gem: number; rug: number };
  flagged?:    boolean;
}

export interface Community {
  id:              string;
  name:            string;
  description:     string;
  type:            "public" | "private";
  inviteCode?:     string;
  owner:           string;
  members:         string[];
  posts:           CommunityPost[];
  createdAt:       number;
  emoji:           string;
  color:           string;
  tags:            string[];
  price?:          number;
  // Token gating
  tokenMint?:      string;
  tokenSymbol?:    string;
  tokenLogo?:      string;
  tokenPrice?:     number;
  tokenMcap?:      number;
  minTokensToPost: number;
  // Computed
  sentiment:       number;
}

// ── Spam detection ────────────────────────────────────────────────────────────

const SPAM_PATTERNS = [
  /free\s*sol/i, /airdrop/i, /dm\s*me/i, /click\s*link/i, /t\.me\//i,
  /telegram\.me/i, /bit\.ly/i, /tinyurl/i, /join\s*now/i, /limited\s*time/i,
  /send\s*sol/i, /double\s*your/i, /guaranteed\s*profit/i, /100x\s*guaranteed/i,
];

export function isSpam(text: string): boolean {
  return SPAM_PATTERNS.some(p => p.test(text));
}

// ── Sentiment calculation ─────────────────────────────────────────────────────

export function calcSentiment(posts: CommunityPost[]): number {
  const recent = posts.slice(0, 50);
  if (!recent.length) return 50;
  let pos = 0, neg = 0;
  for (const p of recent) {
    pos += p.reactions.fire + p.reactions.gem;
    neg += p.reactions.rug;
  }
  const total = pos + neg;
  if (!total) return 50;
  return Math.round((pos / total) * 100);
}

// ── Cache + persistence ───────────────────────────────────────────────────────

const cache = new Map<string, Community>();
const KEY_IDS = "community:ids";
function KEY(id: string) { return `community:${id}`; }
const TTL = 30 * 24 * 3600;

async function persist(c: Community): Promise<void> {
  c.sentiment = calcSentiment(c.posts);
  cache.set(c.id, c);
  await redis.set(KEY(c.id), c, TTL);
  const ids = (await redis.get<string[]>(KEY_IDS)) ?? [];
  if (!ids.includes(c.id)) {
    ids.push(c.id);
    await redis.set(KEY_IDS, ids, TTL);
  }
}

async function load(id: string): Promise<Community | null> {
  if (cache.has(id)) return cache.get(id)!;
  const stored = await redis.get<Community>(KEY(id));
  if (stored) {
    // Migrate old records that lack new fields
    if (stored.minTokensToPost === undefined) stored.minTokensToPost = 0;
    if (stored.sentiment === undefined) stored.sentiment = calcSentiment(stored.posts ?? []);
    for (const p of stored.posts ?? []) {
      if (!p.type) p.type = "text";
      if (!p.authorEmoji) p.authorEmoji = "👤";
    }
    cache.set(id, stored);
    return stored;
  }
  return null;
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

  const demos: Omit<Community, "posts" | "sentiment">[] = [
    { id: "degen-lounge",  name: "Degen Lounge",  emoji: "🎰", color: "#ef4444", description: "High-risk high-reward plays. Meme coins, early launches, ape calls.", type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 7 * 86400000,  tags: ["meme","degen","ape"],    minTokensToPost: 0 },
    { id: "solana-alpha",  name: "Solana Alpha",  emoji: "⚡", color: "#a855f7", description: "Curated on-chain alpha for Solana traders. No noise, just signals.",   type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 14 * 86400000, tags: ["alpha","solana"],        minTokensToPost: 0 },
    { id: "kol-watchers",  name: "KOL Watchers",  emoji: "👁️", color: "#3b82f6", description: "Track what the top KOL wallets are buying and selling in real time.",  type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 3 * 86400000,  tags: ["kol","copy-trade"],      minTokensToPost: 0 },
    { id: "meme-workshop", name: "Meme Workshop", emoji: "🧪", color: "#10b981", description: "Token idea brainstorming — narratives, names, and early launches.",    type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 2 * 86400000,  tags: ["meme","launch"],         minTokensToPost: 0 },
  ];
  const welcomes: Record<string, string> = {
    "degen-lounge":  "Welcome to Degen Lounge 🎰 Share your highest-conviction plays.",
    "solana-alpha":  "Welcome to Solana Alpha ⚡ Signal-only group — on-chain observations and token calls.",
    "kol-watchers":  "Welcome to KOL Watchers 👁️ Share notable wallet moves from the KOL feed.",
    "meme-workshop": "Welcome to Meme Workshop 🧪 Brainstorm token names, narratives, and early ideas.",
  };
  for (const d of demos) {
    const post: CommunityPost = {
      id: `seed-${d.id}-0`, author: "GEASS", authorAlias: "GEASS", authorEmoji: "⚡",
      type: "text", text: welcomes[d.id] ?? "", createdAt: Date.now() - 3 * 3600000,
      reactions: { fire: 3, gem: 2, rug: 0 },
    };
    await persist({ ...d, posts: [post], sentiment: 100 });
  }
}

seedIfEmpty().catch(() => {});

// ── Slug helpers ──────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

async function uniqueId(base: string): Promise<string> {
  let id = base || "community";
  let n = 2;
  while ((await load(id)) !== null) id = `${base}-${n++}`;
  return id;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listCommunities(wallet?: string): Promise<Community[]> {
  const ids = (await redis.get<string[]>(KEY_IDS)) ?? [...cache.keys()];
  const all = await Promise.all(ids.map(id => load(id)));
  return (all.filter(Boolean) as Community[])
    .filter(c => c.type === "public" || c.owner === wallet || c.members.includes(wallet ?? ""))
    .sort((a, b) => b.members.length - a.members.length || b.createdAt - a.createdAt);
}

export async function getCommunity(id: string): Promise<Community | null> {
  return load(id);
}

export interface CreateInput {
  name: string; description: string; type: "public" | "private";
  emoji: string; color: string; tags: string[];
  owner: string; ownerAlias: string; ownerEmoji: string;
  price?: number;
  tokenMint?: string; tokenSymbol?: string; tokenLogo?: string;
  tokenPrice?: number; tokenMcap?: number; minTokensToPost?: number;
}

export async function createCommunity(input: CreateInput): Promise<Community> {
  const id = await uniqueId(slugify(input.name));
  const inviteCode = input.type === "private"
    ? Math.random().toString(36).slice(2, 10).toUpperCase()
    : undefined;
  const welcome: CommunityPost = {
    id: `welcome-${id}`, author: input.owner,
    authorAlias: input.ownerAlias || input.owner.slice(0, 8),
    authorEmoji: input.ownerEmoji || "👤",
    type: "text",
    text: `Welcome to ${input.name}! 🎉 ${input.description}`,
    createdAt: Date.now(), reactions: { fire: 0, gem: 0, rug: 0 },
  };
  const c: Community = {
    id, name: input.name, description: input.description, type: input.type,
    inviteCode, owner: input.owner, members: [input.owner],
    posts: [welcome], createdAt: Date.now(),
    emoji: input.emoji, color: input.color, tags: input.tags,
    price: input.price && input.price > 0 ? input.price : undefined,
    tokenMint: input.tokenMint, tokenSymbol: input.tokenSymbol,
    tokenLogo: input.tokenLogo, tokenPrice: input.tokenPrice,
    tokenMcap: input.tokenMcap,
    minTokensToPost: input.minTokensToPost ?? 0,
    sentiment: 50,
  };
  await persist(c);
  return c;
}

export async function joinCommunity(id: string, wallet: string, inviteCode?: string): Promise<{ ok: boolean; error?: string }> {
  const c = await load(id);
  if (!c) return { ok: false, error: "Community not found" };
  if (c.members.includes(wallet)) return { ok: true };
  if (c.type === "private" && inviteCode?.trim().toUpperCase() !== c.inviteCode) {
    return { ok: false, error: "Invalid invite code" };
  }
  c.members.push(wallet);
  await persist(c);
  return { ok: true };
}

export async function leaveCommunity(id: string, wallet: string): Promise<{ ok: boolean }> {
  const c = await load(id);
  if (!c) return { ok: false };
  c.members = c.members.filter(m => m !== wallet);
  await persist(c);
  return { ok: true };
}

export async function addPost(
  id: string, wallet: string, alias: string, authorEmoji: string,
  text: string, type: "text" | "call" | "buy" = "text",
  tokenMint?: string, tokenSym?: string,
): Promise<CommunityPost | null> {
  const c = await load(id);
  if (!c || !c.members.includes(wallet)) return null;
  const post: CommunityPost = {
    id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    author:      wallet,
    authorAlias: alias || wallet.slice(0, 8),
    authorEmoji: authorEmoji || "👤",
    type,
    text:        text.slice(0, 500),
    tokenMint,
    tokenSym,
    createdAt:   Date.now(),
    reactions:   { fire: 0, gem: 0, rug: 0 },
    flagged:     isSpam(text),
  };
  c.posts.unshift(post);
  if (c.posts.length > 200) c.posts = c.posts.slice(0, 200);
  await persist(c);
  return post;
}

export async function deletePost(communityId: string, postId: string, wallet: string): Promise<{ ok: boolean }> {
  const c = await load(communityId);
  if (!c) return { ok: false };
  const post = c.posts.find(p => p.id === postId);
  if (!post) return { ok: false };
  const creatorAdmin = await isCreatorWallet(wallet);
  if (!creatorAdmin && post.author !== wallet && c.owner !== wallet) return { ok: false };
  c.posts = c.posts.filter(p => p.id !== postId);
  await persist(c);
  return { ok: true };
}

export async function deleteCommunity(id: string, wallet: string): Promise<{ ok: boolean; error?: string }> {
  const c = await load(id);
  if (!c) return { ok: false, error: "Not found" };
  const creatorAdmin = await isCreatorWallet(wallet);
  if (!creatorAdmin && c.owner !== wallet) return { ok: false, error: "Not authorized" };
  cache.delete(id);
  await redis.set(KEY(id), null as unknown as Community, 1);
  const ids = (await redis.get<string[]>(KEY_IDS)) ?? [];
  await redis.set(KEY_IDS, ids.filter(i => i !== id), 30 * 24 * 3600);
  return { ok: true };
}

export async function getFlaggedPosts(): Promise<{ communityId: string; communityName: string; post: CommunityPost }[]> {
  const ids = (await redis.get<string[]>(KEY_IDS)) ?? [...cache.keys()];
  const all = await Promise.all(ids.map(id => load(id)));
  const result: { communityId: string; communityName: string; post: CommunityPost }[] = [];
  for (const c of all.filter(Boolean) as Community[]) {
    for (const post of c.posts) {
      if (post.flagged) result.push({ communityId: c.id, communityName: c.name, post });
    }
  }
  return result.sort((a, b) => b.post.createdAt - a.post.createdAt);
}

export async function getAdminStats(): Promise<{
  totalCommunities: number; totalPosts: number; totalMembers: number;
  flaggedPosts: number; publicChannels: number;
}> {
  const ids = (await redis.get<string[]>(KEY_IDS)) ?? [...cache.keys()];
  const all = (await Promise.all(ids.map(id => load(id)))).filter(Boolean) as Community[];
  const memberSet = new Set<string>();
  let totalPosts = 0, flaggedPosts = 0, publicChannels = 0;
  for (const c of all) {
    totalPosts += c.posts.length;
    flaggedPosts += c.posts.filter(p => p.flagged).length;
    if (c.type === "public") publicChannels++;
    c.members.forEach(m => memberSet.add(m));
  }
  return { totalCommunities: all.length, totalPosts, totalMembers: memberSet.size, flaggedPosts, publicChannels };
}

export async function editPost(communityId: string, postId: string, wallet: string, newText: string): Promise<{ ok: boolean }> {
  const c = await load(communityId);
  if (!c) return { ok: false };
  const post = c.posts.find(p => p.id === postId);
  if (!post || post.author !== wallet) return { ok: false };
  post.text = newText.slice(0, 500);
  post.flagged = isSpam(newText);
  await persist(c);
  return { ok: true };
}

export async function reactToPost(communityId: string, postId: string, reaction: "fire" | "gem" | "rug"): Promise<{ ok: boolean }> {
  const c = await load(communityId);
  if (!c) return { ok: false };
  const p = c.posts.find(x => x.id === postId);
  if (!p) return { ok: false };
  p.reactions[reaction]++;
  await persist(c);
  return { ok: true };
}

export interface UpdateInput {
  name?: string; description?: string; type?: "public" | "private";
  emoji?: string; color?: string; tags?: string[];
  minTokensToPost?: number;
}

export async function updateCommunity(id: string, wallet: string, updates: UpdateInput): Promise<{ ok: boolean; error?: string }> {
  const c = await load(id);
  if (!c) return { ok: false, error: "Not found" };
  if (c.owner !== wallet) return { ok: false, error: "Not authorized" };
  if (updates.name !== undefined) c.name = updates.name.trim().slice(0, 40);
  if (updates.description !== undefined) c.description = updates.description.trim().slice(0, 200);
  if (updates.type !== undefined) {
    c.type = updates.type;
    if (updates.type === "private" && !c.inviteCode) {
      c.inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    }
  }
  if (updates.emoji !== undefined) c.emoji = updates.emoji.slice(0, 4);
  if (updates.color !== undefined) c.color = updates.color.slice(0, 9);
  if (updates.tags !== undefined) c.tags = updates.tags.slice(0, 10).map(t => t.trim().slice(0, 20)).filter(Boolean);
  if (updates.minTokensToPost !== undefined) c.minTokensToPost = Math.max(0, updates.minTokensToPost);
  await persist(c);
  return { ok: true };
}
