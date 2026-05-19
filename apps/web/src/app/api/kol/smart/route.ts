import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listSmartWallets } from "@/lib/server/smartWallets";

export const dynamic = "force-dynamic";

/** GET /api/kol/smart?limit=50 — top auto-discovered smart wallets. */
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") || "50");
  return NextResponse.json({ wallets: listSmartWallets(limit) });
}
