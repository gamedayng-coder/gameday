import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateOAuthLink } from "@/lib/canva-client";
import { deleteCanvaCredential } from "@/lib/canva-db";
import { supabase } from "@/lib/supabase";

// GET /api/canva/auth — initiate Canva Connect OAuth 2.0 + PKCE flow
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callbackUrl = `${process.env.AUTH_URL}/api/canva/callback`;
  const { url, codeVerifier, state } = generateOAuthLink(callbackUrl);

  await supabase()
    .from("canva_oauth_state")
    .upsert({ state, user_id: session.user.id, code_verifier: codeVerifier }, { onConflict: "state" });

  return NextResponse.redirect(url);
}

// DELETE /api/canva/auth — disconnect Canva account
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteCanvaCredential(session.user.id);
  return NextResponse.json({ success: true });
}
