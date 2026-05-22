import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ProfileLink {
  type:  string;
  label: string;
  url:   string;
}

interface DexProfile {
  url:          string;
  chainId:      string;
  tokenAddress: string;
  icon:         string | null;
  header:       string | null;
  description:  string | null;
  links:        ProfileLink[];
}

export interface TokenProfile {
  chainId:      string;
  tokenAddress: string;
  icon:         string | null;
  header:       string | null;
  description:  string | null;
  url:          string;
  twitter:      string | null;
  telegram:     string | null;
  website:      string | null;
  discord:      string | null;
}

function pickLink(links: ProfileLink[], match: RegExp): string | null {
  const hit = links.find(l =>
    match.test(l.type ?? "") ||
    match.test(l.label ?? "") ||
    match.test(l.url ?? ""),
  );
  return hit?.url ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chain = (searchParams.get("chain") ?? "solana").toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 90);

  try {
    const res = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", {
      next:   { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ profiles: [] }, { status: 200 });
    }

    const raw = await res.json();
    const list: DexProfile[] = Array.isArray(raw) ? raw : (raw?.data ?? []);

    const profiles: TokenProfile[] = list
      .filter(p => chain === "all" || (p.chainId ?? "").toLowerCase() === chain)
      .slice(0, limit)
      .map(p => {
        const links = Array.isArray(p.links) ? p.links : [];
        return {
          chainId:      p.chainId,
          tokenAddress: p.tokenAddress,
          icon:         p.icon  ?? null,
          header:       p.header ?? null,
          description:  p.description ?? null,
          url:          p.url,
          twitter:      pickLink(links, /twitter|x\.com/i),
          telegram:     pickLink(links, /telegram|t\.me/i),
          discord:      pickLink(links, /discord/i),
          website:      pickLink(links, /website|home|docs/i),
        };
      });

    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ profiles: [] }, { status: 200 });
  }
}
