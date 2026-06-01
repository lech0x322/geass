import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL = 365 * 24 * 3600;       // 1 year
const MAX_BYTES = 64 * 1024;        // 64KB cap on the data URL string
function avatarKey(wallet: string) { return `avatar:${wallet}`; }

/** GET /api/profile/avatar?wallet=... → { avatar: string | null } */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "avatar_get", max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.trim() ?? "";
  if (!wallet) return NextResponse.json({ avatar: null });

  const avatar = await redis.get<string>(avatarKey(wallet));
  return NextResponse.json({ avatar: avatar ?? null });
}

/** PUT /api/profile/avatar  body { wallet, avatar } */
export async function PUT(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "avatar_put", max: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet = String(body.wallet ?? "").trim();
  const avatar = body.avatar === null ? null : String(body.avatar ?? "");

  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  // Delete
  if (avatar === null || avatar === "") {
    await redis.set(avatarKey(wallet), "", 1);
    return NextResponse.json({ ok: true });
  }

  // Validate it's a reasonably-sized image data URL
  if (!avatar.startsWith("data:image/")) {
    return NextResponse.json({ error: "Avatar must be an image" }, { status: 400 });
  }
  if (avatar.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large after compression" }, { status: 413 });
  }

  await redis.set(avatarKey(wallet), avatar, TTL);
  return NextResponse.json({ ok: true });
}
