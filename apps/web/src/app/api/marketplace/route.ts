import { NextResponse } from "next/server";
import { listListings, createListing, type ListingCategory } from "@/lib/server/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = ["launch","promotion","design","technical","alpha","audit","other"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const search   = searchParams.get("search")   ?? undefined;
  const seller   = searchParams.get("seller")   ?? undefined;

  const listings = await listListings({
    category: CATEGORIES.includes(category ?? "") ? (category as ListingCategory) : undefined,
    search,
    seller,
  });
  return NextResponse.json({ listings });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const seller        = String(body.seller ?? "").trim();
  const sellerAlias   = String(body.sellerAlias ?? "").trim().slice(0, 24);
  const title         = String(body.title ?? "").trim().slice(0, 80);
  const description   = String(body.description ?? "").trim().slice(0, 1000);
  const category      = CATEGORIES.includes(String(body.category)) ? String(body.category) as ListingCategory : "other";
  const price         = typeof body.price === "number" ? body.price : 0;
  const priceNeg      = body.priceNegotiable === true;
  const deliveryTime  = String(body.deliveryTime ?? "").trim().slice(0, 20);
  const contactMethod = ["telegram","discord","dm"].includes(String(body.contactMethod)) ? String(body.contactMethod) as "telegram"|"discord"|"dm" : "dm";
  const contactHandle = body.contactHandle ? String(body.contactHandle).slice(0, 50) : undefined;
  const emoji         = String(body.emoji ?? "📦").slice(0, 4);
  const tags          = Array.isArray(body.tags) ? (body.tags as string[]).map(t => String(t).slice(0, 20)).slice(0, 8) : [];

  if (!seller)  return NextResponse.json({ error: "Seller wallet required" }, { status: 400 });
  if (!title || title.length < 5) return NextResponse.json({ error: "Title must be at least 5 characters" }, { status: 400 });
  if (!description || description.length < 20) return NextResponse.json({ error: "Description must be at least 20 characters" }, { status: 400 });
  if (!deliveryTime) return NextResponse.json({ error: "Delivery time required" }, { status: 400 });

  const listing = await createListing({ seller, sellerAlias, title, description, category, price, priceNegotiable: priceNeg, deliveryTime, contactMethod, contactHandle, emoji, tags });
  return NextResponse.json({ listing }, { status: 201 });
}
