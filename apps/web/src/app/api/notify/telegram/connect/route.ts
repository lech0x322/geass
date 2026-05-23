import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/server/redis";
import { verifyJwt } from "@/lib/server/siws";
import { sendTelegramAlert } from "@/lib/server/telegram";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "geass_session";

interface ConnectBody {
  chatId: string;
  wallet: string;
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "tg-connect", max: 10, windowMs: 60_000 });
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

  // Parse and validate body
  let body: ConnectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { chatId, wallet } = body;

  if (!chatId || !/^\d+$/.test(chatId)) {
    return NextResponse.json({ error: "chatId must be a numeric string" }, { status: 400 });
  }
  if (!wallet || typeof wallet !== "string") {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  // Ensure the authenticated wallet matches the requested wallet
  if (session.address !== wallet) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Store both directions so the webhook can resolve wallet ↔ chatId
  await redis.set(`tg:chat:${wallet}`, chatId);
  await redis.set(`tg:wallet:${chatId}`, wallet);

  // Send welcome message
  await sendTelegramAlert(chatId, {
    title: "GEASS Alerts Connected",
    body: `Your wallet ${wallet.slice(0, 6)}…${wallet.slice(-4)} is now connected. You'll receive trading alerts here.`,
    emoji: "✅",
  });

  return NextResponse.json({ ok: true });
}
