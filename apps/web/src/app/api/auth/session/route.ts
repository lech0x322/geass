import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/server/siws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("geass_session")?.value;
  if (!token) return NextResponse.json({ address: null });

  const session = await verifyJwt(token);
  return NextResponse.json({ address: session?.address ?? null });
}
