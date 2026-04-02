import { getDb } from "@/lib/db";

export type PublishChannel = "twitter" | "instagram" | "facebook" | "tiktok" | "telegram" | "linkedin";

export interface PublishingRoutine {
  id: string;
  user_id: string;
  name: string;
  content_type: string; // "any" | "game_day" | "result" | "weekly_schedule"
  channels: string; // JSON array of PublishChannel[]
  schedule_rule: string; // JSON: { type: "immediate" | "scheduled", time?: "HH:MM", days?: number[] }
  max_per_day: number;
  timezone: string;
  enabled: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface PublishingSchedule {
  id: string;
  user_id: string;
  content_item_id: string | null;
  channel: PublishChannel;
  scheduled_at: string;
  status: "pending" | "sent" | "failed" | "dry_run";
  is_dry_run: number; // 0 or 1
  result: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  content_caption?: string | null;
}

export const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland",
];

export function getRoutines(userId: string): PublishingRoutine[] {
  return getDb()
    .prepare("SELECT * FROM publishing_routines WHERE user_id = ? ORDER BY name ASC")
    .all(userId) as PublishingRoutine[];
}

export function getRoutineById(id: string, userId: string): PublishingRoutine | undefined {
  return getDb()
    .prepare("SELECT * FROM publishing_routines WHERE id = ? AND user_id = ?")
    .get(id, userId) as PublishingRoutine | undefined;
}

export function createRoutine(
  id: string,
  userId: string,
  name: string,
  contentType: string,
  channels: PublishChannel[],
  scheduleRule: object,
  maxPerDay: number,
  timezone: string
): PublishingRoutine {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO publishing_routines (id, user_id, name, content_type, channels, schedule_rule, max_per_day, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
    )
    .run(id, userId, name, contentType, JSON.stringify(channels), JSON.stringify(scheduleRule), maxPerDay, timezone, now, now);
  return getRoutineById(id, userId)!;
}

export function updateRoutine(
  id: string,
  userId: string,
  fields: Partial<Pick<PublishingRoutine, "name" | "content_type" | "max_per_day" | "timezone" | "enabled"> & {
    channels?: PublishChannel[];
    schedule_rule?: object;
  }>
): PublishingRoutine | undefined {
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];
  if (fields.name !== undefined) { sets.push("name = ?"); params.push(fields.name); }
  if (fields.content_type !== undefined) { sets.push("content_type = ?"); params.push(fields.content_type); }
  if (fields.channels !== undefined) { sets.push("channels = ?"); params.push(JSON.stringify(fields.channels)); }
  if (fields.schedule_rule !== undefined) { sets.push("schedule_rule = ?"); params.push(JSON.stringify(fields.schedule_rule)); }
  if (fields.max_per_day !== undefined) { sets.push("max_per_day = ?"); params.push(fields.max_per_day); }
  if (fields.timezone !== undefined) { sets.push("timezone = ?"); params.push(fields.timezone); }
  if (fields.enabled !== undefined) { sets.push("enabled = ?"); params.push(fields.enabled); }
  params.push(id, userId);
  getDb()
    .prepare(`UPDATE publishing_routines SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...params);
  return getRoutineById(id, userId);
}

export function deleteRoutine(id: string, userId: string): void {
  getDb()
    .prepare("DELETE FROM publishing_routines WHERE id = ? AND user_id = ?")
    .run(id, userId);
}

export function getSchedules(userId: string, options: { isDryRun?: boolean; status?: string; limit?: number } = {}): PublishingSchedule[] {
  const conditions = ["ps.user_id = ?"];
  const params: unknown[] = [userId];
  if (options.isDryRun !== undefined) { conditions.push("ps.is_dry_run = ?"); params.push(options.isDryRun ? 1 : 0); }
  if (options.status) { conditions.push("ps.status = ?"); params.push(options.status); }
  const limit = options.limit ? `LIMIT ${options.limit}` : "";
  return getDb()
    .prepare(`
      SELECT ps.*, ci.caption AS content_caption
      FROM publishing_schedules ps
      LEFT JOIN content_items ci ON ci.id = ps.content_item_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ps.scheduled_at ASC
      ${limit}
    `)
    .all(...params) as PublishingSchedule[];
}

export function createSchedule(
  id: string,
  userId: string,
  contentItemId: string | null,
  channel: PublishChannel,
  scheduledAt: string,
  isDryRun: boolean
): PublishingSchedule {
  const now = new Date().toISOString();
  const status = isDryRun ? "dry_run" : "pending";
  getDb()
    .prepare(
      "INSERT INTO publishing_schedules (id, user_id, content_item_id, channel, scheduled_at, status, is_dry_run, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)"
    )
    .run(id, userId, contentItemId, channel, scheduledAt, status, isDryRun ? 1 : 0, now, now);
  return getDb()
    .prepare("SELECT * FROM publishing_schedules WHERE id = ?")
    .get(id) as PublishingSchedule;
}

export function deleteSchedule(id: string, userId: string): void {
  getDb()
    .prepare("DELETE FROM publishing_schedules WHERE id = ? AND user_id = ?")
    .run(id, userId);
}
