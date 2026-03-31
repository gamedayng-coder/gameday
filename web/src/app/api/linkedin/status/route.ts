import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLinkedInCredential } from "@/lib/linkedin-db";

// GET /api/linkedin/status — check connection status
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cred = getLinkedInCredential();
  if (!cred) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    name: cred.linkedin_name,
    userId: cred.linkedin_user_id,
    expiresAt: cred.expires_at,
  });
}
