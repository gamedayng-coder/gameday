import { getDb } from "@/lib/db";

export type AuthType = "bearer" | "x-auth-token" | "api-key" | "basic";

export interface DataSource {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  api_key: string;
  auth_type: AuthType;
  created_at: string;
  updated_at: string;
}

export function getDataSources(userId: string): DataSource[] {
  return getDb()
    .prepare("SELECT * FROM data_sources WHERE user_id = ? ORDER BY name ASC")
    .all(userId) as DataSource[];
}

export function getDataSourceById(id: string, userId: string): DataSource | undefined {
  return getDb()
    .prepare("SELECT * FROM data_sources WHERE id = ? AND user_id = ?")
    .get(id, userId) as DataSource | undefined;
}

export function createDataSource(
  id: string,
  userId: string,
  name: string,
  baseUrl: string,
  apiKey: string,
  authType: AuthType
): DataSource {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO data_sources (id, user_id, name, base_url, api_key, auth_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(id, userId, name, baseUrl, apiKey, authType, now, now);
  return getDataSourceById(id, userId)!;
}

export function updateDataSource(
  id: string,
  userId: string,
  fields: Partial<Pick<DataSource, "name" | "base_url" | "api_key" | "auth_type">>
): DataSource | undefined {
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];
  if (fields.name !== undefined) { sets.push("name = ?"); params.push(fields.name); }
  if (fields.base_url !== undefined) { sets.push("base_url = ?"); params.push(fields.base_url); }
  if (fields.api_key !== undefined) { sets.push("api_key = ?"); params.push(fields.api_key); }
  if (fields.auth_type !== undefined) { sets.push("auth_type = ?"); params.push(fields.auth_type); }
  params.push(id, userId);
  getDb()
    .prepare(`UPDATE data_sources SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...params);
  return getDataSourceById(id, userId);
}

export function deleteDataSource(id: string, userId: string): void {
  getDb()
    .prepare("DELETE FROM data_sources WHERE id = ? AND user_id = ?")
    .run(id, userId);
}
