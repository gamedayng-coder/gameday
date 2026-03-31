import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTwitterAppClient } from "@/lib/twitter-client";
import { deleteTwitterCredential } from "@/lib/twitter-db";
import { getDb } from "@/lib/db";

// GET /api/twitter/auth — initiate OAuth 2.0 PKCE flow
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appClient = getTwitterAppClient();
  const callbackUrl = `${process.env.AUTH_URL}/api/twitter/callback`;
  const { url, codeVerifier, state } = appClient.generateOAuth2AuthLink(callbackUrl, {
    scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
  });

  // Persist state + code_verifier for the callback
  getDb()
    .prepare("INSERT OR REPLACE INTO twitter_oauth_state (state, code_verifier) VALUES (?, ?)")
    .run(state, codeVerifier);

  return NextResponse.redirect(url);
}

// DELETE /api/twitter/auth — disconnect Twitter account
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteTwitterCredential();
  return NextResponse.json({ success: true });
}
