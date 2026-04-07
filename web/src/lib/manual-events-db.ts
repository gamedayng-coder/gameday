import { supabase } from "@/lib/supabase";

export type InputMode = "json" | "table" | "freeform";

export interface ManualEvent {
  id: string;
  user_id: string;
  title: string;
  event_data: string; // JSON string
  raw_input: string | null;
  input_mode: InputMode;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

function serialize(row: Record<string, unknown>): ManualEvent {
  return {
    ...(row as unknown as ManualEvent),
    event_data: typeof row.event_data === "string" ? row.event_data : JSON.stringify(row.event_data),
  };
}

export async function getManualEvents(userId: string, templatesOnly = false): Promise<ManualEvent[]> {
  let query = supabase().from("manual_events").select("*").eq("user_id", userId);
  if (templatesOnly) {
    query = query.eq("is_template", true).order("title", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => serialize(row as unknown as Record<string, unknown>));
}

export async function getManualEventById(id: string, userId: string): Promise<ManualEvent | undefined> {
  const { data } = await supabase().from("manual_events").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return undefined;
  return serialize(data as unknown as Record<string, unknown>);
}

export async function createManualEvent(
  id: string, userId: string, title: string,
  eventData: Record<string, unknown>, rawInput: string | null,
  inputMode: InputMode, isTemplate: boolean
): Promise<ManualEvent> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("manual_events")
    .insert({ id, user_id: userId, title, event_data: eventData, raw_input: rawInput, input_mode: inputMode, is_template: isTemplate, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return serialize(data as unknown as Record<string, unknown>);
}

export async function updateManualEvent(
  id: string, userId: string,
  fields: Partial<{ title: string; input_mode: InputMode; is_template: boolean; event_data: Record<string, unknown>; raw_input: string | null }>
): Promise<ManualEvent | undefined> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.event_data !== undefined) update.event_data = fields.event_data;
  if (fields.raw_input !== undefined) update.raw_input = fields.raw_input;
  if (fields.input_mode !== undefined) update.input_mode = fields.input_mode;
  if (fields.is_template !== undefined) update.is_template = fields.is_template;
  const { data } = await supabase().from("manual_events").update(update).eq("id", id).eq("user_id", userId).select().maybeSingle();
  if (!data) return undefined;
  return serialize(data as unknown as Record<string, unknown>);
}

export async function deleteManualEvent(id: string, userId: string): Promise<void> {
  await supabase().from("manual_events").delete().eq("id", id).eq("user_id", userId);
}
