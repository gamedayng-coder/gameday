import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildTikTokAuthUrl, generatePKCE } from "@/lib/tiktok-client";
import { deleteTikTokCredential } from "@/lib/tiktok-db";
import { getDb } from "@/lib/db";

// GET /api/tiktok/auth — initiate OAuth 2.0 PKCE flow
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString("base64url");
  const redirectUri = `${process.env.AUTH_URL}/api/tiktok/callback`;

  // Store state + code_verifier for CSRF and PKCE validation in callback
  getDb()
    .prepare("INSERT OR REPLACE INTO tiktok_oauth_state (state, code_verifier) VALUES (?, ?)")
    .run(state, codeVerifier);

  const authUrl = buildTikTokAuthUrl(redirectUri, state, codeChallenge);
  return NextResponse.redirect(authUrl);
}

// DELETE /api/tiktok/auth — disconnect TikTok account
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteTikTokCredential();
  return NextResponse.json({ success: true });
}
