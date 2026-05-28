export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { fetchNewPumpTokens } from "@/lib/server/dexscreener";
import { computeMri, type MriScore } from "@/lib/server/mriEngine";
import { cached } from "@/lib/server/cache";

export async function GET(req: NextRequest) {
  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") ?? "12", 10);
  const limit = Math.min(isNaN(rawLimit) ? 12 : rawLimit, 20);

  const result = await cached(
    `mri:leaderboard:${limit}`,
    45_000,
    async () => {
      const tokens = await fetchNewPumpTokens();
      const candidates = tokens.slice(0, limit * 3);

      const settled = await Promise.allSettled(
        candidates.map((t) => computeMri(t.mint)),
      );

      const scores: MriScore[] = settled
        .filter(
          (r): r is PromiseFulfilledResult<MriScore> =>
            r.status === "fulfilled" && r.value !== null && r.value.tier !== "IGNORE",
        )
        .map((r) => r.value)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

      return { scores, computedAt: Date.now() };
    },
  );

  return NextResponse.json(result);
}
