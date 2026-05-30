import { NextResponse } from "next/server";
import { addReview } from "@/lib/server/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const reviewer      = String(body.reviewer ?? "").trim();
  const reviewerAlias = String(body.reviewerAlias ?? "").trim().slice(0, 24);
  const rating        = typeof body.rating === "number" ? body.rating : 0;
  const comment       = String(body.comment ?? "").trim().slice(0, 300);

  if (!reviewer) return NextResponse.json({ error: "Reviewer wallet required" }, { status: 400 });
  if (rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  if (!comment) return NextResponse.json({ error: "Comment required" }, { status: 400 });

  const result = await addReview(id, reviewer, reviewerAlias, rating, comment);
  if (!result.ok) {
    const status = result.error === "Not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
