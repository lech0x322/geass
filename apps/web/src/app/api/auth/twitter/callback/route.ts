import { NextResponse } from "next/server";
import { redis } from "@/lib/server/redis";
import { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, APP_BASE_URL } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TwitterTokenResponse = { access_token?: string; error?: string };
type TwitterUserResponse  = { data?: { id: string; username: string } };

export async function GET(request: Request) {
  const url   = new URL(request.url);
  const code  = url.searchParams.get("code")  ?? "";
  const state = url.searchParams.get("state") ?? "";
  const err   = url.searchParams.get("error");

  if (err) {
    return NextResponse.redirect(`${APP_BASE_URL}/?login_error=${encodeURIComponent("Twitter login cancelled")}`);
  }

  const codeVerifier = await redis.get<string>(`twitter:state:${state}`);
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_BASE_URL}/?login_error=${encodeURIComponent("Session expired — try again")}`);
  }
  await redis.set(`twitter:state:${state}`, "used", 10);

  // Exchange code for access token
  const credentials = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64");
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  `${APP_BASE_URL}/api/auth/twitter/callback`,
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await tokenRes.json() as TwitterTokenResponse;
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${APP_BASE_URL}/?login_error=${encodeURIComponent("Twitter login failed — try again")}`);
  }

  // Fetch Twitter user info
  const userRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userRes.json() as TwitterUserResponse;
  const twitterId = userData.data?.id;

  if (!twitterId) {
    return NextResponse.redirect(`${APP_BASE_URL}/?login_error=${encodeURIComponent("Could not fetch Twitter profile")}`);
  }

  const wallet = `tw:${twitterId}`;

  // HTML sets localStorage then redirects — avoids needing a cookie session
  const html = `<!DOCTYPE html><html><head><title>Logging in…</title></head><body>
<script>
try { localStorage.setItem("geass_wallet","${wallet}"); } catch(e){}
window.location.replace("/");
</script>
<noscript><meta http-equiv="refresh" content="0;url=/"></noscript>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
