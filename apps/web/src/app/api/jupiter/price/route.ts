import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const key = process.env.JUPITER_API_KEY;
  const ids = req.nextUrl.searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ error: "Missing required param: ids" }, { status: 400 });
  }

  try {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (key) headers["Authorization"] = `Bearer ${key}`;

    const res = await fetch(`https://api.jup.ag/price/v2?ids=${encodeURIComponent(ids)}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json() as { data: Record<string, { price: number }> };
    return NextResponse.json({ data: data.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
