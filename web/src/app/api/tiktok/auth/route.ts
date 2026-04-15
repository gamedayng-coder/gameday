import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildTikTokAuthUrl, generatePKCE } from "@/lib/tiktok-client";
import { deleteTikTokCredential } from "@/lib/tiktok-db";
import { supabase } from "@/lib/supabase";

// GET /api/tiktok/auth — initiate OAuth 2.0 PKCE flow
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString("base64url");
  const redirectUri = `${process.env.AUTH_URL}/api/tiktok/callback`;

  // Store user_id in state so callback can associate the credential with this user
  await supabase()
    .from("tiktok_oauth_state")
    .upsert({ state, user_id: session.user.id, code_verifier: codeVerifier }, { onConflict: "state" });

  const authUrl = buildTikTokAuthUrl(redirectUri, state, codeChallenge);
  return NextResponse.redirect(authUrl);
}

// DELETE /api/tiktok/auth — disconnect TikTok account
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteTikTokCredential(session.user.id);
  return NextResponse.json({ success: true });
}
