import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TWITTER_CLIENT_ID, TWITTER_CALLBACK_URL } from "@/lib/env";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function sha256(plain: string): Promise<Buffer> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(plain).digest();
}

function randomString(len = 48): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
  return base64url(randomBytes(len));
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "twitter-init", max: 20, windowMs: 60_000 });
  if (limited) return limited;

  if (!TWITTER_CLIENT_ID) {
    return NextResponse.json({ error: "Twitter OAuth not configured" }, { status: 503 });
  }

  const state         = randomString(24);
  const codeVerifier  = randomString(48);
  const codeChallenge = base64url(await sha256(codeVerifier));

  // Store state + verifier for 10 minutes
  await redis.set(`twitter:oauth:${state}`, { codeVerifier }, 600);

  const params = new URLSearchParams({
    response_type:         "code",
    client_id:             TWITTER_CLIENT_ID,
    redirect_uri:          TWITTER_CALLBACK_URL,
    scope:                 "tweet.read users.read offline.access",
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
}
