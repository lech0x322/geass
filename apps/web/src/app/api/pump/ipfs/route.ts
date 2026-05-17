import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_UA = "Mozilla/5.0 (compatible; GEASS/1.0; +https://geass.app)";

async function fetchImage(rawUrl: string): Promise<{ blob: Blob; filename: string }> {
  let u: URL;
  try { u = new URL(rawUrl); } catch { throw new Error("Image URL is not a valid URL"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Image URL must use http or https");

  const r = await fetch(rawUrl, {
    headers: { "User-Agent": FETCH_UA, Accept: "image/*" },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`image fetch ${r.status}`);

  const ct = r.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/")) throw new Error(`URL did not return an image (got ${ct || "no content-type"})`);

  const blob = await r.blob();
  if (blob.size === 0) throw new Error("image is empty");
  if (blob.size > MAX_IMAGE_BYTES) throw new Error("image exceeds 5 MB");

  const ext = ct.split("/")[1]?.split(";")[0]?.trim() || "png";
  return { blob, filename: `image.${ext}` };
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "ipfs", max: 10, windowMs: 60_000 });
  if (limited) return limited;

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  // Resolve image: prefer uploaded file, then server-side fetch from imageUrl
  const existing = form.get("file");
  const imageUrl = (form.get("imageUrl") ?? "").toString().trim();
  form.delete("imageUrl");

  if (!(existing instanceof Blob) || existing.size === 0) {
    if (imageUrl) {
      try {
        const { blob, filename } = await fetchImage(imageUrl);
        form.set("file", blob, filename);
      } catch (e) {
        return NextResponse.json(
          { error: `Could not load image from URL: ${e instanceof Error ? e.message : String(e)}` },
          { status: 400 },
        );
      }
    }
    // No image is acceptable — pump.fun will use a placeholder
  }

  if (!form.get("name") || !form.get("symbol")) {
    return NextResponse.json({ error: "Token name and symbol are required" }, { status: 400 });
  }

  try {
    const upstream = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: form,
      headers: { "User-Agent": FETCH_UA },
      signal: AbortSignal.timeout(25_000),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      const hint = upstream.status === 500
        ? " — pump.fun may have rejected the image format or is rate-limiting requests."
        : "";
      return NextResponse.json(
        { error: `pump.fun ipfs ${upstream.status}: ${text.slice(0, 200)}${hint}` },
        { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 },
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
