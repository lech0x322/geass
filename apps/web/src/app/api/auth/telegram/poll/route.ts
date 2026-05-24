import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const value = await redis.get<string>(`tg:otp:${code}`);

  if (value === null) {
    return NextResponse.json({ error: "Code expired" });
  }

  if (value === "pending") {
    return NextResponse.json({ verified: false });
  }

  // value is the Telegram chatId — login complete
  const chatId = value;
  await redis.set(`tg:otp:${code}`, "used", 10);
  const wallet = `tg:${chatId}`;

  return NextResponse.json({ verified: true, wallet });
}
