import { supabase } from "@/lib/supabase";

export type PublishChannel = "twitter" | "instagram" | "facebook" | "tiktok" | "telegram" | "linkedin";

export interface PublishingRoutine {
  id: string;
  user_id: string;
  name: string;
  content_type: string;
  channels: string; // JSON array
  schedule_rule: string; // JSON object
  max_per_day: number;
  timezone: string;
  enabled: boolean;
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
  is_dry_run: boolean;
  result: string | null;
  created_at: string;
  updated_at: string;
  content_caption?: string | null;
}

export const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland",
];

function serializeRoutine(row: Record<string, unknown>): PublishingRoutine {
  return {
    ...(row as unknown as PublishingRoutine),
    channels: typeof row.channels === "string" ? row.channels : JSON.stringify(row.channels),
    schedule_rule: typeof row.schedule_rule === "string" ? row.schedule_rule : JSON.stringify(row.schedule_rule),
  };
}

export async function getRoutines(userId: string): Promise<PublishingRoutine[]> {
  const { data, error } = await supabase().from("publishing_routines").select("*").eq("user_id", userId).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => serializeRoutine(row as unknown as Record<string, unknown>));
}

export async function getRoutineById(id: string, userId: string): Promise<PublishingRoutine | undefined> {
  const { data } = await supabase().from("publishing_routines").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return undefined;
  return serializeRoutine(data as unknown as Record<string, unknown>);
}

export async function createRoutine(
  id: string, userId: string, name: string, contentType: string,
  channels: PublishChannel[], scheduleRule: object, maxPerDay: number, timezone: string
): Promise<PublishingRoutine> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("publishing_routines")
    .insert({ id, user_id: userId, name, content_type: contentType, channels, schedule_rule: scheduleRule, max_per_day: maxPerDay, timezone, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return serializeRoutine(data as unknown as Record<string, unknown>);
}

export async function updateRoutine(
  id: string, userId: string,
  fields: Partial<Pick<PublishingRoutine, "name" | "content_type" | "max_per_day" | "timezone" | "enabled"> & {
    channels?: PublishChannel[];
    schedule_rule?: object;
  }>
): Promise<PublishingRoutine | undefined> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.content_type !== undefined) update.content_type = fields.content_type;
  if (fields.channels !== undefined) update.channels = fields.channels;
  if (fields.schedule_rule !== undefined) update.schedule_rule = fields.schedule_rule;
  if (fields.max_per_day !== undefined) update.max_per_day = fields.max_per_day;
  if (fields.timezone !== undefined) update.timezone = fields.timezone;
  if (fields.enabled !== undefined) update.enabled = fields.enabled;
  const { data } = await supabase().from("publishing_routines").update(update).eq("id", id).eq("user_id", userId).select().maybeSingle();
  if (!data) return undefined;
  return serializeRoutine(data as unknown as Record<string, unknown>);
}

export async function deleteRoutine(id: string, userId: string): Promise<void> {
  await supabase().from("publishing_routines").delete().eq("id", id).eq("user_id", userId);
}

const SCHEDULE_SELECT = `
  *,
  content_item:content_items!publishing_schedules_content_item_id_fkey(caption)
`;

function flattenSchedule(row: Record<string, unknown>): PublishingSchedule {
  const ci = row.content_item as { caption: string } | null;
  const { content_item: _ci, ...rest } = row;
  return { ...(rest as unknown as PublishingSchedule), content_caption: ci?.caption ?? null };
}

export async function getSchedules(userId: string, options: { isDryRun?: boolean; status?: string; limit?: number } = {}): Promise<PublishingSchedule[]> {
  let query = supabase().from("publishing_schedules").select(SCHEDULE_SELECT).eq("user_id", userId).order("scheduled_at", { ascending: true });
  if (options.isDryRun !== undefined) query = query.eq("is_dry_run", options.isDryRun);
  if (options.status) query = query.eq("status", options.status);
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => flattenSchedule(row as unknown as Record<string, unknown>));
}

export async function createSchedule(
  id: string, userId: string, contentItemId: string | null,
  channel: PublishChannel, scheduledAt: string, isDryRun: boolean
): Promise<PublishingSchedule> {
  const now = new Date().toISOString();
  const status = isDryRun ? "dry_run" : "pending";
  const { data, error } = await supabase()
    .from("publishing_schedules")
    .insert({ id, user_id: userId, content_item_id: contentItemId, channel, scheduled_at: scheduledAt, status, is_dry_run: isDryRun, created_at: now, updated_at: now })
    .select(SCHEDULE_SELECT)
    .single();
  if (error) throw error;
  return flattenSchedule(data as unknown as Record<string, unknown>);
}

export async function deleteSchedule(id: string, userId: string): Promise<void> {
  await supabase().from("publishing_schedules").delete().eq("id", id).eq("user_id", userId);
}
