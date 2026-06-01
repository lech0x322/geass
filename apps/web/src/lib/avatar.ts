// Client-side avatar helpers.
//
// Avatars are resized to a small square thumbnail and JPEG-compressed before
// upload so they stay well under the server cap (~64KB) and sync across
// devices via the profile avatar endpoint.

const AVATAR_SIZE = 128;        // px — square thumbnail edge
const JPEG_QUALITY = 0.82;

/**
 * Read an uploaded image file, center-crop to a square, resize to
 * AVATAR_SIZE×AVATAR_SIZE and return a compressed JPEG data URL.
 */
export function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas unsupported")); return; }

        // Center-crop to a square source region
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const cacheKey = (wallet: string) => `geass_avatar_${wallet}`;

/** Read the locally-cached avatar (instant paint before the server responds). */
export function getCachedAvatar(wallet: string): string | null {
  try { return localStorage.getItem(cacheKey(wallet)); } catch { return null; }
}

/** Update the local cache. */
export function setCachedAvatar(wallet: string, dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(cacheKey(wallet), dataUrl);
    else localStorage.removeItem(cacheKey(wallet));
  } catch { /* noop */ }
}

/** Fetch the server-stored avatar (syncs across devices). */
export async function fetchAvatar(wallet: string): Promise<string | null> {
  try {
    const r = await fetch(`/api/profile/avatar?wallet=${encodeURIComponent(wallet)}`);
    if (!r.ok) return null;
    const d = await r.json() as { avatar: string | null };
    return d.avatar ?? null;
  } catch { return null; }
}

/** Upload an avatar to the server. Returns the saved data URL or throws. */
export async function uploadAvatar(wallet: string, dataUrl: string): Promise<void> {
  const r = await fetch("/api/profile/avatar", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, avatar: dataUrl }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({})) as { error?: string };
    throw new Error(d.error ?? "Upload failed");
  }
}
