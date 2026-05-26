import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { bucket: "send", max: 10, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const { signedTxBase64 } = await req.json();
    if (!signedTxBase64 || typeof signedTxBase64 !== "string") {
      return NextResponse.json({ error: "Missing signedTxBase64" }, { status: 400 });
    }
    const signature = await heliusRpc<string>("sendTransaction", [
      signedTxBase64,
      { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" },
    ]);
    return NextResponse.json({ signature });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
