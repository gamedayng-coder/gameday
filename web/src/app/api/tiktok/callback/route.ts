import { NextRequest, NextResponse } from "next/server";
import { exchangeTikTokCode, getTikTokUserInfo } from "@/lib/tiktok-client";
import { upsertTikTokCredential } from "@/lib/tiktok-db";
import { getDb } from "@/lib/db";

// GET /api/tiktok/callback — OAuth 2.0 redirect handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/admin/tiktok?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/tiktok?error=missing_params`);
  }

  const stored = getDb()
    .prepare("SELECT state, code_verifier FROM tiktok_oauth_state WHERE state = ?")
    .get(state) as { state: string; code_verifier: string } | undefined;

  if (!stored) {
    return NextResponse.redirect(`${baseUrl}/admin/tiktok?error=invalid_state`);
  }

  getDb().prepare("DELETE FROM tiktok_oauth_state WHERE state = ?").run(state);

  try {
    const redirectUri = `${baseUrl}/api/tiktok/callback`;
    const { accessToken, refreshToken, expiresIn, openId } = await exchangeTikTokCode(
      code,
      redirectUri,
      stored.code_verifier
    );
    const { openId: resolvedOpenId, displayName } = await getTikTokUserInfo(accessToken, openId);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    upsertTikTokCredential(resolvedOpenId, displayName, accessToken, refreshToken, expiresAt);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "unknown";
    return NextResponse.redirect(`${baseUrl}/admin/tiktok?error=${msg}`);
  }

  return NextResponse.redirect(`${baseUrl}/admin/tiktok?connected=true`);
}
