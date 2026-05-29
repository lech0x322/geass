import "server-only";
import { redis } from "./redis";

export interface CommunityPost {
  id:           string;
  author:       string;
  authorAlias:  string;
  text:         string;
  tokenMint?:   string;
  createdAt:    number;
  reactions:    { fire: number; gem: number; rug: number };
}

export interface Community {
  id:          string;
  name:        string;
  description: string;
  type:        "public" | "private";
  inviteCode?: string;
  owner:       string;
  members:     string[];
  posts:       CommunityPost[];
  createdAt:   number;
  emoji:       string;
  color:       string;
  tags:        string[];
  price?:      number; // SOL — 0 or undefined = free
}

// ── In-memory write-through cache ─────────────────────────────────────────────
const cache = new Map<string, Community>();

const KEY_IDS = "community:ids";
function KEY(id: string) { return `community:${id}`; }
const TTL = 30 * 24 * 3600; // 30 days

async function persist(c: Community): Promise<void> {
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
  if (stored) { cache.set(id, stored); return stored; }
  return null;
}

// ── Seed (runs once; skips if Redis already has data) ─────────────────────────

let seeded = false;
async function seedIfEmpty(): Promise<void> {
  if (seeded) return;
  seeded = true;
  const existingIds = await redis.get<string[]>(KEY_IDS);
  if (existingIds && existingIds.length > 0) {
    for (const id of existingIds) await load(id);
    return;
  }

  const demos: Omit<Community, "posts">[] = [
    { id: "degen-lounge",  name: "Degen Lounge",  emoji: "🎰", color: "#ef4444", description: "High-risk high-reward plays. Meme coins, early launches, ape calls.", type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 7 * 86400000,  tags: ["meme","degen","ape"] },
    { id: "solana-alpha",  name: "Solana Alpha",  emoji: "⚡", color: "#a855f7", description: "Curated on-chain alpha for Solana traders. No noise, just signals.",   type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 14 * 86400000, tags: ["alpha","solana","signals"] },
    { id: "kol-watchers",  name: "KOL Watchers",  emoji: "👁️", color: "#3b82f6", description: "Track what the top KOL wallets are buying and selling in real time.",  type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 3 * 86400000,  tags: ["kol","copy-trade","alpha"] },
    { id: "meme-workshop", name: "Meme Workshop", emoji: "🧪", color: "#10b981", description: "Token idea brainstorming — narratives, names, and early launches.",    type: "public", owner: "GEASS", members: ["GEASS"], createdAt: Date.now() - 2 * 86400000,  tags: ["meme","launch","creative"] },
  ];
  const welcomes: Record<string, string> = {
    "degen-lounge":  "Welcome to Degen Lounge 🎰 Share your highest-conviction plays.",
    "solana-alpha":  "Welcome to Solana Alpha ⚡ Signal-only group — on-chain observations and token calls.",
    "kol-watchers":  "Welcome to KOL Watchers 👁️ Share notable wallet moves from the KOL feed.",
    "meme-workshop": "Welcome to Meme Workshop 🧪 Brainstorm token names, narratives, and early ideas.",
  };
  for (const d of demos) {
    const post: CommunityPost = { id: `seed-${d.id}-0`, author: "GEASS", authorAlias: "GEASS", text: welcomes[d.id] ?? "", createdAt: Date.now() - 3 * 3600000, reactions: { fire: 0, gem: 0, rug: 0 } };
    await persist({ ...d, posts: [post] });
  }
}

seedIfEmpty().catch(() => {});

// ── Slug helpers ──────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

async function uniqueId(base: string): Promise<string> {
  let id = base || "community";
  let n  = 2;
  while ((await load(id)) !== null) id = `${base}-${n++}`;
  return id;
}

// ── Public API (async) ────────────────────────────────────────────────────────

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
  owner: string; ownerAlias: string; price?: number;
}

export async function createCommunity(input: CreateInput): Promise<Community> {
  const id = await uniqueId(slugify(input.name));
  const inviteCode = input.type === "private"
    ? Math.random().toString(36).slice(2, 10).toUpperCase()
    : undefined;
  const welcome: CommunityPost = {
    id: `welcome-${id}`, author: input.owner,
    authorAlias: input.ownerAlias || input.owner.slice(0, 8),
    text: `Welcome to ${input.name}! 🎉 ${input.description}`,
    createdAt: Date.now(), reactions: { fire: 0, gem: 0, rug: 0 },
  };
  const c: Community = {
    id, name: input.name, description: input.description, type: input.type,
    inviteCode, owner: input.owner, members: [input.owner],
    posts: [welcome], createdAt: Date.now(),
    emoji: input.emoji, color: input.color, tags: input.tags,
    price: input.price && input.price > 0 ? input.price : undefined,
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

export async function addPost(id: string, wallet: string, alias: string, text: string, tokenMint?: string): Promise<CommunityPost | null> {
  const c = await load(id);
  if (!c || !c.members.includes(wallet)) return null;
  const post: CommunityPost = {
    id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    author:      wallet,
    authorAlias: alias || wallet.slice(0, 8),
    text:        text.slice(0, 500),
    tokenMint,
    createdAt:   Date.now(),
    reactions:   { fire: 0, gem: 0, rug: 0 },
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
  if (!post || (post.author !== wallet && c.owner !== wallet)) return { ok: false };
  c.posts = c.posts.filter(p => p.id !== postId);
  await persist(c);
  return { ok: true };
}

export async function editPost(communityId: string, postId: string, wallet: string, newText: string): Promise<{ ok: boolean }> {
  const c = await load(communityId);
  if (!c) return { ok: false };
  const post = c.posts.find(p => p.id === postId);
  if (!post || post.author !== wallet) return { ok: false };
  post.text = newText.slice(0, 500);
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
