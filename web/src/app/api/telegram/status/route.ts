import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTelegramCredential } from "@/lib/telegram-db";

// GET /api/telegram/status — check bot connection status
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cred = await getTelegramCredential();
  if (!cred) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    botUsername: cred.bot_username,
    chatId: cred.chat_id,
  });
}
