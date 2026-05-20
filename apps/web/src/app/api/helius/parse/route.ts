import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseTransactions } from "@/lib/server/helius";

/**
 * POST /api/helius/parse
 * Body: { signatures: string[] }   (max 100)
 * Returns: HeliusEnhancedTransaction[]
 */
export async function POST(req: NextRequest) {
  let body: { signatures?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }

  const sigs = Array.isArray(body.signatures)
    ? body.signatures.filter((s: unknown): s is string => typeof s === "string")
    : [];
  if (!sigs.length) return NextResponse.json({ transactions: [] });

  try {
    const transactions = await parseTransactions(sigs);
    return NextResponse.json({ transactions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), transactions: [] },
      { status: 502 },
    );
  }
}
