import { NextRequest, NextResponse } from "next/server";
import { getTwitterAppClient } from "@/lib/twitter-client";
import { upsertTwitterCredential } from "@/lib/twitter-db";
import { supabase } from "@/lib/supabase";

// GET /api/twitter/callback — OAuth 2.0 redirect handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/twitter?error=missing_params`);
  }

  const { data: stored } = await supabase()
    .from("twitter_oauth_state")
    .select("user_id, code_verifier")
    .eq("state", state)
    .single();

  if (!stored) {
    return NextResponse.redirect(`${baseUrl}/admin/twitter?error=invalid_state`);
  }

  await supabase().from("twitter_oauth_state").delete().eq("state", state);

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

    await upsertTwitterCredential(stored.user_id, me.id, me.username, accessToken, refreshToken ?? null, expiresAt);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "unknown";
    return NextResponse.redirect(`${baseUrl}/admin/twitter?error=${msg}`);
  }

  return NextResponse.redirect(`${baseUrl}/admin/twitter?connected=true`);
}
