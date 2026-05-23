import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/server/redis";
import { issueJwt } from "@/lib/server/siws";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "geass_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "tg-otp-poll", max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ verified: false, error: "Invalid code" });
  }

  const stored = await redis.get<{ verified: boolean; chatId: string | null }>(`tg:otp:${code}`);
  if (!stored) return NextResponse.json({ verified: false, error: "Code expired" });
  if (!stored.verified || !stored.chatId) return NextResponse.json({ verified: false });

  // OTP confirmed — issue JWT, invalidate OTP
  await redis.del(`tg:otp:${code}`);
  const address = `tg:${stored.chatId}`;
  const token   = await issueJwt(address);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });

  return NextResponse.json({ verified: true, address });
}
