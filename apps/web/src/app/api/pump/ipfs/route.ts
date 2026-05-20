import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Real browser UA — pump.fun filters non-browser requests
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/gif":  "gif",
  "image/webp": "webp",
};

function normalizeType(raw: string): string {
  const base = raw.split(";")[0].trim().toLowerCase();
  if (base === "image/jpg") return "image/jpeg";
  return base;
}

async function resolveImage(
  file: File | null,
  imageUrl: string,
): Promise<{ buf: ArrayBuffer; mime: string; ext: string } | null> {
  if (file && file.size > 0) {
    const mime = normalizeType(file.type || "image/png");
    const ext  = ALLOWED_MIME[mime] ?? "png";
    return { buf: await file.arrayBuffer(), mime, ext };
  }
  if (imageUrl) {
    const r = await fetch(imageUrl, {
      headers: { "User-Agent": BROWSER_UA, Accept: "image/*" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (!r.ok) throw new Error(`Image fetch ${r.status}`);
    const ct   = normalizeType(r.headers.get("content-type") ?? "image/png");
    const mime = ALLOWED_MIME[ct] ? ct : "image/png";
    const ext  = ALLOWED_MIME[mime] ?? "png";
    const buf  = await r.arrayBuffer();
    if (buf.byteLength === 0) throw new Error("Image is empty");
    if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("Image exceeds 5 MB");
    return { buf, mime, ext };
  }
  return null;
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "ipfs", max: 10, windowMs: 60_000 });
  if (limited) return limited;

  let inForm: FormData;
  try { inForm = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  const name     = inForm.get("name")?.toString().trim() ?? "";
  const symbol   = inForm.get("symbol")?.toString().trim() ?? "";
  const desc     = inForm.get("description")?.toString().trim() ?? name;
  const imageUrl = inForm.get("imageUrl")?.toString().trim() ?? "";
  const file     = inForm.get("file") instanceof File ? inForm.get("file") as File : null;

  if (!name || !symbol) {
    return NextResponse.json({ error: "Token name and symbol are required" }, { status: 400 });
  }

  let imgResult: { buf: ArrayBuffer; mime: string; ext: string } | null = null;
  try {
    imgResult = await resolveImage(file, imageUrl);
  } catch (e) {
    return NextResponse.json(
      { error: `Image error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  // Build a fresh FormData — never reuse the incoming one to avoid Node.js serialization issues
  const out = new FormData();
  out.append("name",        name);
  out.append("symbol",      symbol.toUpperCase());
  out.append("description", desc);
  out.append("showName",    "true");
  if (imgResult) {
    out.append("file", new Blob([imgResult.buf], { type: imgResult.mime }), `image.${imgResult.ext}`);
  }

  try {
    const upstream = await fetch("https://pump.fun/api/ipfs", {
      method:  "POST",
      body:    out,
      headers: { "User-Agent": BROWSER_UA },
      signal:  AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: `pump.fun IPFS ${upstream.status}: ${text.slice(0, 300) || "upload failed"}` },
        { status: 502 },
      );
    }

    return NextResponse.json(await upstream.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
