import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/server/redis";
import { issueJwt } from "@/lib/server/siws";
import { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, TWITTER_CALLBACK_URL } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "geass_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const APP_URL        = `https://${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "geass.app"}`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code")  ?? "";
  const state = searchParams.get("state") ?? "";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_URL}?login_error=${encodeURIComponent("Twitter login cancelled")}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}?login_error=${encodeURIComponent("Invalid callback")}`);
  }

  // Retrieve and immediately invalidate PKCE verifier (one-time use)
  const stored = await redis.get<{ codeVerifier: string }>(`twitter:oauth:${state}`);
  if (!stored?.codeVerifier) {
    return NextResponse.redirect(`${APP_URL}?login_error=${encodeURIComponent("Session expired — please try again")}`);
  }
  await redis.del(`twitter:oauth:${state}`);

  // Exchange code for access token
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  TWITTER_CALLBACK_URL,
      code_verifier: stored.codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[twitter/callback] token exchange failed:", err);
    return NextResponse.redirect(`${APP_URL}?login_error=${encodeURIComponent("Twitter authentication failed")}`);
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  // Fetch Twitter user info
  const userRes = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=username,name,profile_image_url",
    { headers: { Authorization: `Bearer ${access_token}` } },
  );

  if (!userRes.ok) {
    return NextResponse.redirect(`${APP_URL}?login_error=${encodeURIComponent("Could not fetch Twitter profile")}`);
  }

  const { data: tw } = await userRes.json() as {
    data: { id: string; username: string; name: string; profile_image_url?: string };
  };

  // Issue GEASS session — address prefix "x:" distinguishes from Solana wallets
  const address = `x:${tw.id}`;
  const token   = await issueJwt(address);

  // Cache Twitter profile for display in the app
  await redis.set(`twitter:profile:${address}`, {
    username:        tw.username,
    name:            tw.name,
    profileImageUrl: tw.profile_image_url ?? null,
  }, 7 * 24 * 3600);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });

  return NextResponse.redirect(APP_URL);
}
