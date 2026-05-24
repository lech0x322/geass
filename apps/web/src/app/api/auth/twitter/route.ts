import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TWITTER_CLIENT_ID, APP_BASE_URL } from "@/lib/env";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET() {
  if (!TWITTER_CLIENT_ID) {
    return NextResponse.redirect(`${APP_BASE_URL}/?login_error=${encodeURIComponent("Twitter login not configured")}`);
  }

  const codeVerifier  = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state         = base64url(crypto.randomBytes(16));

  await redis.set(`twitter:state:${state}`, codeVerifier, 600);

  const params = new URLSearchParams({
    response_type:         "code",
    client_id:             TWITTER_CLIENT_ID,
    redirect_uri:          `${APP_BASE_URL}/api/auth/twitter/callback`,
    scope:                 "tweet.read users.read",
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
}
