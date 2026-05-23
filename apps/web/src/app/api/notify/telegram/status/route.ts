import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/server/redis";
import { verifyJwt } from "@/lib/server/siws";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "geass_session";

interface TgChatRecord {
  chatId: string;
  connectedAt: number;
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "tg-status", max: 30, windowMs: 60_000 });
  if (limited) return limited;

  // Auth: verify session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await verifyJwt(token);
  if (!session?.address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallet = session.address;
  const record = await redis.get<TgChatRecord>(`tg:chat:${wallet}`);

  if (!record?.chatId) {
    return NextResponse.json({ connected: false, chatId: null });
  }

  return NextResponse.json({ connected: true, chatId: record.chatId });
}
