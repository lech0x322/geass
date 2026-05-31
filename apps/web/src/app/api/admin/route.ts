import { NextResponse } from "next/server";
import { getProfile, CREATOR_USERNAMES } from "@/lib/server/profile";
import { getAdminStats, getFlaggedPosts, deleteCommunity, listCommunities } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkCreator(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  const profile = await getProfile(wallet);
  return !!profile && CREATOR_USERNAMES.some(u => u.toLowerCase() === profile.username.toLowerCase());
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.trim() ?? "";
  if (!await checkCreator(wallet)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [stats, flagged, communities] = await Promise.all([
    getAdminStats(),
    getFlaggedPosts(),
    listCommunities(),
  ]);

  return NextResponse.json({ stats, flagged, communities });
}

export async function DELETE(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet      = String(body.wallet ?? "").trim();
  const communityId = String(body.communityId ?? "").trim();

  if (!await checkCreator(wallet)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });

  const result = await deleteCommunity(communityId, wallet);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
