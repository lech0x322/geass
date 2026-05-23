import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/server/redis";
import { verifyJwt } from "@/lib/server/siws";
import { sendTelegramAlert } from "@/lib/server/telegram";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "geass_session";

interface TgChatRecord {
  chatId: string;
  connectedAt: number;
}

export async function DELETE(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "tg-disconnect", max: 10, windowMs: 60_000 });
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
  const key = `tg:chat:${wallet}`;

  // Retrieve chatId before deletion so we can send a farewell message
  const record = await redis.get<TgChatRecord>(key);

  // Remove from Redis
  await redis.del(key);

  // Send farewell message if we had a chatId
  if (record?.chatId) {
    await sendTelegramAlert(record.chatId, {
      title: "GEASS Alerts Disconnected",
      body: `Your wallet ${wallet.slice(0, 6)}…${wallet.slice(-4)} has been disconnected. You will no longer receive alerts here.`,
      emoji: "👋",
    });
  }

  return NextResponse.json({ ok: true });
}
