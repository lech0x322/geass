import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { submitJitoBundle } from "@/lib/server/jitoService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { transactions: string[] }
 * Accepts an array of base64-encoded signed transactions and submits them as a
 * Jito bundle. Typically called from the frontend after Phantom signs the txs.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "jito-submit", max: 8, windowMs: 60_000 });
  if (limited) return limited;

  let body: { transactions: string[] };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
    return NextResponse.json({ error: "transactions must be a non-empty array" }, { status: 400 });
  }
  if (body.transactions.length > 5) {
    return NextResponse.json({ error: "Maximum 5 transactions per bundle" }, { status: 400 });
  }

  try {
    const result = await submitJitoBundle(body.transactions);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
