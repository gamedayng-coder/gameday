import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTikTokCredential } from "@/lib/tiktok-db";

// GET /api/tiktok/status — check connection status
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cred = await getTikTokCredential();
  if (!cred) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    displayName: cred.tiktok_display_name,
    openId: cred.tiktok_open_id,
    expiresAt: cred.expires_at,
  });
}
