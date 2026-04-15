import { NextRequest, NextResponse } from "next/server";
import { exchangeLinkedInCode, getLinkedInUserInfo } from "@/lib/linkedin-client";
import { upsertLinkedInCredential } from "@/lib/linkedin-db";
import { supabase } from "@/lib/supabase";

// GET /api/linkedin/callback — OAuth 2.0 redirect handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/admin/linkedin?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/linkedin?error=missing_params`);
  }

  const { data: stored } = await supabase()
    .from("linkedin_oauth_state")
    .select("user_id")
    .eq("state", state)
    .single();

  if (!stored) {
    return NextResponse.redirect(`${baseUrl}/admin/linkedin?error=invalid_state`);
  }

  await supabase().from("linkedin_oauth_state").delete().eq("state", state);

  try {
    const callbackUrl = `${baseUrl}/api/linkedin/callback`;
    const { accessToken, expiresIn } = await exchangeLinkedInCode(code, callbackUrl);
    const { sub, name } = await getLinkedInUserInfo(accessToken);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertLinkedInCredential(stored.user_id, sub, name, accessToken, expiresAt);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "unknown";
    return NextResponse.redirect(`${baseUrl}/admin/linkedin?error=${msg}`);
  }

  return NextResponse.redirect(`${baseUrl}/admin/linkedin?connected=true`);
}
