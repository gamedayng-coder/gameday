import { getDb } from "@/lib/db";

export interface TelegramCredential {
  id: number;
  bot_token: string;
  chat_id: string;
  bot_username: string | null;
  created_at: string;
  updated_at: string;
}

export type TelegramPostStatus = "pending" | "published" | "failed" | "cancelled";

export interface TelegramPost {
  id: number;
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: TelegramPostStatus;
  telegram_message_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export function getTelegramCredential(): TelegramCredential | undefined {
  return getDb()
    .prepare("SELECT * FROM telegram_credentials ORDER BY created_at DESC LIMIT 1")
    .get() as TelegramCredential | undefined;
}

export function upsertTelegramCredential(
  botToken: string,
  chatId: string,
  botUsername: string | null
): TelegramCredential {
  const db = getDb();
  db.prepare("DELETE FROM telegram_credentials").run();
  db.prepare(`
    INSERT INTO telegram_credentials (bot_token, chat_id, bot_username)
    VALUES (?, ?, ?)
  `).run(botToken, chatId, botUsername);
  return getTelegramCredential()!;
}

export function deleteTelegramCredential(): void {
  getDb().prepare("DELETE FROM telegram_credentials").run();
}

export function createTelegramPost(
  content: string,
  posterId: string | null,
  scheduledAt: Date | null
): TelegramPost {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO telegram_posts (content, poster_id, scheduled_at, status)
    VALUES (?, ?, ?, 'pending')
  `).run(content, posterId, scheduledAt ? scheduledAt.toISOString() : null);
  return getTelegramPostById(result.lastInsertRowid as number)!;
}

export function getTelegramPostById(id: number): TelegramPost | undefined {
  return getDb()
    .prepare("SELECT * FROM telegram_posts WHERE id = ?")
    .get(id) as TelegramPost | undefined;
}

export function getTelegramPosts(limit = 50): TelegramPost[] {
  return getDb()
    .prepare("SELECT * FROM telegram_posts ORDER BY created_at DESC LIMIT ?")
    .all(limit) as TelegramPost[];
}

export function getDueTelegramPosts(): TelegramPost[] {
  return getDb()
    .prepare(`
      SELECT * FROM telegram_posts
      WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
      ORDER BY scheduled_at ASC
    `)
    .all() as TelegramPost[];
}

export function markTelegramPostPublished(id: number, messageId: string): void {
  getDb().prepare(`
    UPDATE telegram_posts
    SET status='published', telegram_message_id=?, published_at=datetime('now'), error=NULL
    WHERE id=?
  `).run(messageId, id);
}

export function markTelegramPostFailed(id: number, error: string): void {
  getDb().prepare(`
    UPDATE telegram_posts
    SET status='failed', error=?
    WHERE id=?
  `).run(error, id);
}

export function cancelTelegramPost(id: number): void {
  getDb().prepare(`
    UPDATE telegram_posts SET status='cancelled'
    WHERE id=? AND status='pending'
  `).run(id);
}
