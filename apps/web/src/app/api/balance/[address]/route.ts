import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!address || address.length < 32) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  try {
    const res = await heliusRpc<{ value: number } | number>("getBalance", [address]);
    const lamports = typeof res === "number" ? res : res?.value ?? 0;
    return NextResponse.json({ lamports, sol: lamports / 1e9 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
