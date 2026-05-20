import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTransactionHistory } from "@/lib/server/helius";

/**
 * GET /api/helius/history/{address}?limit=50&before=<sig>&type=SWAP
 * Returns parsed transaction history for the address.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const sp = req.nextUrl.searchParams;
  const limit  = Number(sp.get("limit") || "50");
  const before = sp.get("before") || undefined;
  const until  = sp.get("until")  || undefined;
  const type   = sp.get("type")   || undefined;

  try {
    const transactions = await getTransactionHistory(address, { limit, before, until, type });
    return NextResponse.json({ transactions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), transactions: [] },
      { status: 502 },
    );
  }
}
