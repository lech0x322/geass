import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "ipfs", max: 10, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const form = await request.formData();
    const upstream = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: `pump.fun ipfs ${upstream.status}: ${text.slice(0, 200)}` },
        { status: upstream.status },
      );
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
