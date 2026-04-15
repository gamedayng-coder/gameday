import { NextRequest, NextResponse } from "next/server";
import { exchangeTikTokCode, getTikTokUserInfo } from "@/lib/tiktok-client";
import { upsertTikTokCredential } from "@/lib/tiktok-db";
import { supabase } from "@/lib/supabase";

// GET /api/tiktok/callback — OAuth 2.0 redirect handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/admin/tiktok?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/tiktok?error=missing_params`);
  }

  const { data: stored } = await supabase()
    .from("tiktok_oauth_state")
    .select("user_id, code_verifier")
    .eq("state", state)
    .single();

  if (!stored) {
    return NextResponse.redirect(`${baseUrl}/admin/tiktok?error=invalid_state`);
  }

  await supabase().from("tiktok_oauth_state").delete().eq("state", state);

  try {
    const redirectUri = `${baseUrl}/api/tiktok/callback`;
    const { accessToken, refreshToken, expiresIn, openId } = await exchangeTikTokCode(
      code, redirectUri, stored.code_verifier
    );
    const { openId: resolvedOpenId, displayName } = await getTikTokUserInfo(accessToken, openId);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await upsertTikTokCredential(stored.user_id, resolvedOpenId, displayName, accessToken, refreshToken, expiresAt);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "unknown";
    return NextResponse.redirect(`${baseUrl}/admin/tiktok?error=${msg}`);
  }

  return NextResponse.redirect(`${baseUrl}/admin/tiktok?connected=true`);
}
