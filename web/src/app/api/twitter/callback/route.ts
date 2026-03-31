import { NextRequest, NextResponse } from "next/server";
import { getTwitterAppClient } from "@/lib/twitter-client";
import { upsertTwitterCredential } from "@/lib/twitter-db";
import { getDb } from "@/lib/db";

// GET /api/twitter/callback — OAuth 2.0 redirect handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/twitter?error=missing_params`);
  }

  const stored = getDb()
    .prepare("SELECT code_verifier FROM twitter_oauth_state WHERE state = ?")
    .get(state) as { code_verifier: string } | undefined;

  if (!stored) {
    return NextResponse.redirect(`${baseUrl}/admin/twitter?error=invalid_state`);
  }

  getDb().prepare("DELETE FROM twitter_oauth_state WHERE state = ?").run(state);

  try {
    const appClient = getTwitterAppClient();
    const callbackUrl = `${baseUrl}/api/twitter/callback`;

    const { accessToken, refreshToken, expiresIn, client } = await appClient.loginWithOAuth2({
      code,
      codeVerifier: stored.code_verifier,
      redirectUri: callbackUrl,
    });

    const { data: me } = await client.v2.me();
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    upsertTwitterCredential(me.id, me.username, accessToken, refreshToken ?? null, expiresAt);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "unknown";
    return NextResponse.redirect(`${baseUrl}/admin/twitter?error=${msg}`);
  }

  return NextResponse.redirect(`${baseUrl}/admin/twitter?connected=true`);
}
