import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTwitterCredential } from "@/lib/twitter-db";

// GET /api/twitter/status — connection status for the connected Twitter account
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cred = await getTwitterCredential(session.user.id);
  if (!cred) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    username: cred.twitter_username,
    userId: cred.twitter_user_id,
    expiresAt: cred.expires_at,
  });
}
