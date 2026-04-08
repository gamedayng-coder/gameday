import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getProfile } from "@/lib/canva-client";
import { upsertCanvaCredential } from "@/lib/canva-db";
import { supabase } from "@/lib/supabase";

// GET /api/canva/callback — OAuth 2.0 redirect handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/canva?error=missing_params`);
  }

  const { data: stored } = await supabase()
    .from("canva_oauth_state")
    .select("user_id, code_verifier")
    .eq("state", state)
    .single();

  if (!stored) {
    return NextResponse.redirect(`${baseUrl}/admin/canva?error=invalid_state`);
  }

  await supabase().from("canva_oauth_state").delete().eq("state", state);

  try {
    const callbackUrl = `${baseUrl}/api/canva/callback`;
    const tokens = await exchangeCodeForTokens(code, stored.code_verifier, callbackUrl);

    const profile = await getProfile(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await upsertCanvaCredential(
      stored.user_id,
      profile.user.id,
      profile.user.display_name,
      tokens.access_token,
      tokens.refresh_token ?? null,
      expiresAt
    );
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "unknown";
    return NextResponse.redirect(`${baseUrl}/admin/canva?error=${msg}`);
  }

  return NextResponse.redirect(`${baseUrl}/admin/canva?connected=true`);
}
