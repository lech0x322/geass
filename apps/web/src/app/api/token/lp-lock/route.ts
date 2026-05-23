import "server-only";
import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";
import { redis } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Known lock / burn program addresses ──────────────────────────────────────

const BURN_ADDRESS = "1nc1nerator11111111111111111111111111111111";
const FLUXBEAM    = "FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X";
const STREAMFLOW  = "strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m";

const LOCK_PROGRAMS: Record<string, string> = {
  [BURN_ADDRESS]: "burn",
  [FLUXBEAM]:    "fluxbeam",
  [STREAMFLOW]:  "streamflow",
};

export interface LpLockResult {
  mint: string;
  locked: boolean;
  lockProgram: string | null;
  lockedPct: number | null;
  burnedPct: number | null;
}

const CACHE_TTL = 120; // 2 minutes

// ── GET /api/token/lp-lock?mint=<address> ───────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mint = searchParams.get("mint")?.trim();

  if (!mint) {
    return NextResponse.json({ error: "mint required" }, { status: 400 });
  }

  const cacheKey = `lp-lock:${mint}`;

  // Check Redis cache first
  const cached = await redis.get<LpLockResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const result = await checkLpLock(mint);
    await redis.set(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[lp-lock] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

// ── Core lock-check logic ─────────────────────────────────────────────────────

async function checkLpLock(mint: string): Promise<LpLockResult> {
  const base: LpLockResult = {
    mint,
    locked: false,
    lockProgram: null,
    lockedPct: null,
    burnedPct: null,
  };

  // 1. Get the largest LP token holders
  let largestAccounts: Array<{ address: string; amount: string; uiAmount: number | null }>;
  try {
    const res = await heliusRpc<{
      value: Array<{ address: string; amount: string; uiAmountString: string; uiAmount: number | null }>;
    }>("getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
    largestAccounts = res?.value ?? [];
  } catch {
    return base;
  }

  if (!largestAccounts.length) return base;

  // 2. Compute total supply from the top holders list (approximate — sufficient for lock %)
  const total = largestAccounts.reduce((s, a) => s + (a.uiAmount ?? 0), 0);
  if (total <= 0) return base;

  // 3. Resolve owner of each top account via getAccountInfo
  //    We check the top 5 to handle cases where the lock account isn't #1
  const checkAccounts = largestAccounts.slice(0, 5);

  const ownerResults = await Promise.all(
    checkAccounts.map(async (acc) => {
      try {
        const info = await heliusRpc<{
          value: { owner: string; data: unknown } | null;
        }>("getAccountInfo", [acc.address, { encoding: "base64" }]);
        return { acc, owner: info?.value?.owner ?? null };
      } catch {
        return { acc, owner: null };
      }
    }),
  );

  // 4. Tally locked and burned percentages
  let burnedPct = 0;
  let lockedPct = 0;
  let lockProgram: string | null = null;

  for (const { acc, owner } of ownerResults) {
    if (!owner) continue;
    const pct = ((acc.uiAmount ?? 0) / total) * 100;
    const programName = LOCK_PROGRAMS[owner];
    if (!programName) continue;

    if (owner === BURN_ADDRESS) {
      burnedPct += pct;
    } else {
      lockedPct += pct;
      lockProgram = lockProgram ?? programName;
    }
  }

  const totalLockedPct = burnedPct + lockedPct;
  const locked = totalLockedPct > 0;

  return {
    mint,
    locked,
    lockProgram: locked ? (lockProgram ?? (burnedPct > 0 ? "burn" : null)) : null,
    lockedPct: lockedPct > 0 ? Math.round(lockedPct * 100) / 100 : null,
    burnedPct: burnedPct > 0 ? Math.round(burnedPct * 100) / 100 : null,
  };
}
