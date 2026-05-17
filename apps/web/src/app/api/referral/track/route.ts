import { NextResponse } from "next/server";
import { recordClick, getStats } from "@/lib/server/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_RE = /^[1-9A-HJ-NP-Za-km-z]{6,10}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim();
  if (!CODE_RE.test(code)) return NextResponse.json({ clicks: 0, referrals: 0 });
  return NextResponse.json(getStats(code));
}

export async function POST(request: Request) {
  let code: string;
  try {
    const body = await request.json();
    code = (body?.code ?? "").toString().trim();
  } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!CODE_RE.test(code)) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  return NextResponse.json(recordClick(code));
}
