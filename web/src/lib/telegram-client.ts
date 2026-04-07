import { getTelegramCredential } from "@/lib/telegram-db";
import fs from "fs";

const TELEGRAM_API_BASE = "https://api.telegram.org";

// Validate a bot token and return the bot's username.
// Throws if the token is invalid or the API is unreachable.
export async function validateBotToken(botToken: string): Promise<string> {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getMe`);
  const data = await res.json() as { ok: boolean; result?: { username: string }; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram bot token invalid: ${data.description ?? "unknown error"}`);
  }
  return data.result!.username;
}

// Send a text message to the configured channel. Returns the message_id.
export async function sendTelegramMessage(content: string): Promise<string> {
  const cred = await getTelegramCredential();
  if (!cred) throw new Error("No Telegram bot configured");

  const res = await fetch(`${TELEGRAM_API_BASE}/bot${cred.bot_token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: cred.chat_id,
      text: content,
    }),
  });

  const data = await res.json() as { ok: boolean; result?: { message_id: number }; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram sendMessage failed: ${data.description ?? "unknown error"}`);
  }
  return String(data.result!.message_id);
}

// Send a photo with a caption to the configured channel. Returns the message_id.
// imagePath must be a readable local file path.
export async function sendTelegramPhoto(imagePath: string, caption: string): Promise<string> {
  const cred = await getTelegramCredential();
  if (!cred) throw new Error("No Telegram bot configured");

  const imageBuffer = fs.readFileSync(imagePath);
  const fileName = imagePath.split("/").pop() ?? "image.jpg";

  const form = new FormData();
  form.append("chat_id", cred.chat_id);
  form.append("caption", caption);
  form.append("photo", new Blob([imageBuffer]), fileName);

  const res = await fetch(`${TELEGRAM_API_BASE}/bot${cred.bot_token}/sendPhoto`, {
    method: "POST",
    body: form,
  });

  const data = await res.json() as { ok: boolean; result?: { message_id: number }; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram sendPhoto failed: ${data.description ?? "unknown error"}`);
  }
  return String(data.result!.message_id);
}
