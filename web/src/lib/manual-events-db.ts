import { getDb } from "@/lib/db";

export type InputMode = "json" | "table" | "freeform";

export interface ManualEvent {
  id: string;
  user_id: string;
  title: string;
  event_data: string; // JSON string of parsed fields
  raw_input: string | null;
  input_mode: InputMode;
  is_template: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface ManualEventParsed extends Omit<ManualEvent, "event_data"> {
  event_data: Record<string, unknown>;
}

export function getManualEvents(userId: string, templatesOnly = false): ManualEvent[] {
  const query = templatesOnly
    ? "SELECT * FROM manual_events WHERE user_id = ? AND is_template = 1 ORDER BY title ASC"
    : "SELECT * FROM manual_events WHERE user_id = ? ORDER BY created_at DESC";
  return getDb().prepare(query).all(userId) as ManualEvent[];
}

export function getManualEventById(id: string, userId: string): ManualEvent | undefined {
  return getDb()
    .prepare("SELECT * FROM manual_events WHERE id = ? AND user_id = ?")
    .get(id, userId) as ManualEvent | undefined;
}

export function createManualEvent(
  id: string,
  userId: string,
  title: string,
  eventData: Record<string, unknown>,
  rawInput: string | null,
  inputMode: InputMode,
  isTemplate: boolean
): ManualEvent {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO manual_events (id, user_id, title, event_data, raw_input, input_mode, is_template, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)"
    )
    .run(id, userId, title, JSON.stringify(eventData), rawInput, inputMode, isTemplate ? 1 : 0, now, now);
  return getManualEventById(id, userId)!;
}

export function updateManualEvent(
  id: string,
  userId: string,
  fields: Partial<{ title: string; input_mode: InputMode; is_template: boolean; event_data: Record<string, unknown>; raw_input: string | null }>
): ManualEvent | undefined {
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];
  if (fields.title !== undefined) { sets.push("title = ?"); params.push(fields.title); }
  if (fields.event_data !== undefined) { sets.push("event_data = ?"); params.push(JSON.stringify(fields.event_data)); }
  if (fields.raw_input !== undefined) { sets.push("raw_input = ?"); params.push(fields.raw_input); }
  if (fields.input_mode !== undefined) { sets.push("input_mode = ?"); params.push(fields.input_mode); }
  if (fields.is_template !== undefined) { sets.push("is_template = ?"); params.push(fields.is_template ? 1 : 0); }
  params.push(id, userId);
  getDb()
    .prepare(`UPDATE manual_events SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...params);
  return getManualEventById(id, userId);
}

export function deleteManualEvent(id: string, userId: string): void {
  getDb()
    .prepare("DELETE FROM manual_events WHERE id = ? AND user_id = ?")
    .run(id, userId);
}
