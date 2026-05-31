import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/profile/check-handle?handle=...&wallet=...
 *  Returns { available: boolean } — used for real-time uniqueness check.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "check_handle", max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle")?.trim().toLowerCase() ?? "";
  const wallet = searchParams.get("wallet")?.trim() ?? "";

  if (!handle || handle.length < 2 || !/^[a-z0-9_]+$/.test(handle)) {
    return NextResponse.json({ available: false });
  }

  const owner = await redis.get<string>(`username:${handle}`);
  // Available if nobody owns it, or the requester already owns it
  const available = !owner || owner === wallet;
  return NextResponse.json({ available });
}
