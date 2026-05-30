import { NextResponse } from "next/server";
import { getListing, updateListing, incrementView } from "@/lib/server/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await incrementView(id);
  return NextResponse.json({ listing });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const wallet = String(body.wallet ?? "").trim();
  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.title         !== undefined) updates.title         = String(body.title).slice(0, 80);
  if (body.description   !== undefined) updates.description   = String(body.description).slice(0, 1000);
  if (body.price         !== undefined) updates.price         = typeof body.price === "number" ? body.price : undefined;
  if (body.priceNegotiable !== undefined) updates.priceNegotiable = body.priceNegotiable === true;
  if (body.deliveryTime  !== undefined) updates.deliveryTime  = String(body.deliveryTime).slice(0, 20);
  if (body.contactHandle !== undefined) updates.contactHandle = String(body.contactHandle).slice(0, 50);
  if (body.tags          !== undefined) updates.tags          = Array.isArray(body.tags) ? (body.tags as string[]).map(t => String(t).slice(0, 20)).slice(0, 8) : [];
  if (body.status        !== undefined) {
    const s = String(body.status);
    if (["active","sold","cancelled"].includes(s)) updates.status = s;
  }

  const result = await updateListing(id, wallet, updates as Parameters<typeof updateListing>[2]);
  if (!result.ok) {
    const status = result.error === "Not found" ? 404 : result.error === "Not authorized" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let wallet = "";
  try { const body = await req.json(); wallet = String(body.wallet ?? "").trim(); } catch { /* no body */ }
  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  const result = await updateListing(id, wallet, { status: "cancelled" });
  if (!result.ok) {
    const status = result.error === "Not found" ? 404 : result.error === "Not authorized" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
