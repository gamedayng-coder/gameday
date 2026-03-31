import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildLinkedInAuthUrl } from "@/lib/linkedin-client";
import { deleteLinkedInCredential } from "@/lib/linkedin-db";
import { getDb } from "@/lib/db";
import { randomBytes } from "crypto";

// GET /api/linkedin/auth — initiate OAuth 2.0 Authorization Code flow
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  const callbackUrl = `${process.env.AUTH_URL}/api/linkedin/callback`;

  // Persist state for CSRF validation in the callback
  getDb()
    .prepare("INSERT OR REPLACE INTO linkedin_oauth_state (state) VALUES (?)")
    .run(state);

  const authUrl = buildLinkedInAuthUrl(callbackUrl, state);
  return NextResponse.redirect(authUrl);
}

// DELETE /api/linkedin/auth — disconnect LinkedIn account
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteLinkedInCredential();
  return NextResponse.json({ success: true });
}
