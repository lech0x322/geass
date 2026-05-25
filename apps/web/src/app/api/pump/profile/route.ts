import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim();
  if (!wallet) return NextResponse.json({ error: "missing wallet" }, { status: 400 });

  try {
    const [profileRes, coinsRes] = await Promise.all([
      fetch(`https://frontend-api.pump.fun/users/${wallet}`, { signal: AbortSignal.timeout(6000) }),
      fetch(`https://frontend-api.pump.fun/coins?creator=${wallet}&limit=10&offset=0`, { signal: AbortSignal.timeout(6000) }),
    ]);

    const profile = profileRes.ok ? await profileRes.json() : null;
    const coinsData = coinsRes.ok ? await coinsRes.json() : null;

    return NextResponse.json({
      profile: profile ?? null,
      coins: Array.isArray(coinsData) ? coinsData.slice(0, 10) : [],
    });
  } catch {
    return NextResponse.json({ profile: null, coins: [] });
  }
}
