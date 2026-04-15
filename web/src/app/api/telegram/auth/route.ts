import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertTelegramCredential, deleteTelegramCredential } from "@/lib/telegram-db";
import { validateBotToken } from "@/lib/telegram-client";

// POST /api/telegram/auth — save bot token and channel ID
// Body: { botToken: string, chatId: string }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.botToken !== "string" ||
    !body.botToken.trim() ||
    typeof body.chatId !== "string" ||
    !body.chatId.trim()
  ) {
    return NextResponse.json({ error: "botToken and chatId are required" }, { status: 400 });
  }

  const botToken = body.botToken.trim();
  const chatId = body.chatId.trim();

  // Validate token against Telegram API and get bot username
  let botUsername: string;
  try {
    botUsername = await validateBotToken(botToken);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid bot token" },
      { status: 400 }
    );
  }

  const credential = await upsertTelegramCredential(session.user.id, botToken, chatId, botUsername);
  return NextResponse.json({
    botUsername: credential.bot_username,
    chatId: credential.chat_id,
  });
}

// DELETE /api/telegram/auth — disconnect Telegram bot
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteTelegramCredential(session.user.id);
  return NextResponse.json({ success: true });
}
