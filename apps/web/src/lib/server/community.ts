import "server-only";

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
}

const store = new Map<string, Community>();

function seed() {
  const demos: Omit<Community, "posts">[] = [
    {
      id: "degen-lounge", name: "Degen Lounge", emoji: "🎰", color: "#ef4444",
      description: "High-risk high-reward plays. Meme coins, early launches, ape calls.",
      type: "public", owner: "GEASS", members: ["GEASS"],
      createdAt: Date.now() - 7 * 86400000, tags: ["meme", "degen", "ape"],
    },
    {
      id: "solana-alpha", name: "Solana Alpha", emoji: "⚡", color: "#a855f7",
      description: "Curated on-chain alpha for Solana traders. No noise, just signals.",
      type: "public", owner: "GEASS", members: ["GEASS"],
      createdAt: Date.now() - 14 * 86400000, tags: ["alpha", "solana", "signals"],
    },
    {
      id: "kol-watchers", name: "KOL Watchers", emoji: "👁️", color: "#3b82f6",
      description: "Track what the top KOL wallets are buying and selling in real time.",
      type: "public", owner: "GEASS", members: ["GEASS"],
      createdAt: Date.now() - 3 * 86400000, tags: ["kol", "copy-trade", "alpha"],
    },
    {
      id: "meme-workshop", name: "Meme Workshop", emoji: "🧪", color: "#10b981",
      description: "Token idea brainstorming — narratives, names, and early launches.",
      type: "public", owner: "GEASS", members: ["GEASS"],
      createdAt: Date.now() - 2 * 86400000, tags: ["meme", "launch", "creative"],
    },
  ];

  const seedPosts: Record<string, Pick<CommunityPost, "author" | "authorAlias" | "text">[]> = {
    "degen-lounge": [
      { author: "GEASS", authorAlias: "GEASS", text: "Welcome to Degen Lounge 🎰 Share your highest-conviction plays. Nothing under 10x thesis allowed." },
      { author: "GEASS", authorAlias: "GEASS", text: "PSA: Always size your bags based on conviction, not hype. Even degens have risk management." },
    ],
    "solana-alpha": [
      { author: "GEASS", authorAlias: "GEASS", text: "Welcome to Solana Alpha ⚡ Signal-only group. Post on-chain observations and token calls here." },
    ],
    "kol-watchers": [
      { author: "GEASS", authorAlias: "GEASS", text: "Welcome to KOL Watchers 👁️ Monitor the KOL feed tab and share notable wallet moves here." },
    ],
    "meme-workshop": [
      { author: "GEASS", authorAlias: "GEASS", text: "Welcome to Meme Workshop 🧪 Brainstorm token names, narratives, and early ideas before anyone else." },
    ],
  };

  for (const d of demos) {
    const posts = (seedPosts[d.id] ?? []).map((p, i) => ({
      ...p, id: `seed-${d.id}-${i}`,
      createdAt: Date.now() - (4 - i) * 3600000,
      reactions: { fire: Math.floor(Math.random() * 12), gem: Math.floor(Math.random() * 8), rug: 0 },
    }));
    store.set(d.id, { ...d, posts });
  }
}
seed();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function uniqueId(base: string): string {
  let id = base || "community";
  let n = 2;
  while (store.has(id)) id = `${base}-${n++}`;
  return id;
}

export function listCommunities(wallet?: string): Community[] {
  return [...store.values()]
    .filter(c => c.type === "public" || c.owner === wallet || c.members.includes(wallet ?? ""))
    .sort((a, b) => b.members.length - a.members.length || b.createdAt - a.createdAt);
}

export function getCommunity(id: string): Community | null {
  return store.get(id) ?? null;
}

export interface CreateInput {
  name:        string;
  description: string;
  type:        "public" | "private";
  emoji:       string;
  color:       string;
  tags:        string[];
  owner:       string;
  ownerAlias:  string;
}

export function createCommunity(input: CreateInput): Community {
  const id = uniqueId(slugify(input.name));
  const inviteCode = input.type === "private"
    ? Math.random().toString(36).slice(2, 10).toUpperCase()
    : undefined;

  const welcome: CommunityPost = {
    id: `welcome-${id}`,
    author: input.owner,
    authorAlias: input.ownerAlias || input.owner.slice(0, 8),
    text: `Welcome to ${input.name}! 🎉 ${input.description}`,
    createdAt: Date.now(),
    reactions: { fire: 0, gem: 0, rug: 0 },
  };

  const c: Community = {
    id, name: input.name, description: input.description, type: input.type,
    inviteCode, owner: input.owner, members: [input.owner],
    posts: [welcome], createdAt: Date.now(),
    emoji: input.emoji, color: input.color, tags: input.tags,
  };
  store.set(id, c);
  return c;
}

export function joinCommunity(id: string, wallet: string, inviteCode?: string): { ok: boolean; error?: string } {
  const c = store.get(id);
  if (!c) return { ok: false, error: "Community not found" };
  if (c.members.includes(wallet)) return { ok: true };
  if (c.type === "private") {
    if (!inviteCode || inviteCode.trim().toUpperCase() !== c.inviteCode) {
      return { ok: false, error: "Invalid invite code" };
    }
  }
  c.members.push(wallet);
  return { ok: true };
}

export function leaveCommunity(id: string, wallet: string): { ok: boolean } {
  const c = store.get(id);
  if (!c) return { ok: false };
  c.members = c.members.filter(m => m !== wallet);
  return { ok: true };
}

export function addPost(id: string, wallet: string, alias: string, text: string, tokenMint?: string): CommunityPost | null {
  const c = store.get(id);
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
  return post;
}

export function reactToPost(communityId: string, postId: string, reaction: "fire" | "gem" | "rug"): { ok: boolean } {
  const c = store.get(communityId);
  if (!c) return { ok: false };
  const p = c.posts.find(x => x.id === postId);
  if (!p) return { ok: false };
  p.reactions[reaction]++;
  return { ok: true };
}
