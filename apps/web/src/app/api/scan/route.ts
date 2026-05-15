import { NextResponse } from "next/server";
import { runScan } from "@/lib/server/scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const count = Math.min(20, Math.max(1, parseInt(url.searchParams.get("count") || "6", 10)));
  const result = await runScan(count);
  return NextResponse.json(result, { status: result.error ? 503 : 200 });
}
