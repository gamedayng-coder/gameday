import { supabase } from "@/lib/supabase";

export type PosterType = "game_day" | "result" | "weekly_schedule";
export type PosterStatus = "draft" | "approved" | "published" | "failed";

export interface Poster {
  id: string;
  type: PosterType;
  fixture_id: number | null;
  week_start: string | null;
  status: PosterStatus;
  image_path: string | null;
  error: string | null;
  generated_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  fixture_home_team?: string;
  fixture_away_team?: string;
  fixture_date?: string;
  fixture_competition?: string;
}

const POSTER_SELECT = `
  *,
  fixture:sports_fixtures!posters_fixture_id_fkey(
    match_date,
    home_team:sports_teams!sports_fixtures_home_team_id_fkey(name),
    away_team:sports_teams!sports_fixtures_away_team_id_fkey(name),
    competition:sports_competitions!sports_fixtures_competition_id_fkey(name)
  )
`;

function flattenPoster(row: Record<string, unknown>): Poster {
  const fixture = row.fixture as {
    match_date: string;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
    competition: { name: string } | null;
  } | null;
  const { fixture: _f, ...rest } = row;
  return {
    ...(rest as unknown as Poster),
    fixture_home_team: fixture?.home_team?.name,
    fixture_away_team: fixture?.away_team?.name,
    fixture_date: fixture?.match_date,
    fixture_competition: fixture?.competition?.name,
  };
}

export async function createPoster(id: string, type: PosterType, fixtureId: number | null, weekStart: string | null): Promise<Poster> {
  const { data, error } = await supabase()
    .from("posters")
    .insert({ id, type, fixture_id: fixtureId, week_start: weekStart })
    .select(POSTER_SELECT)
    .single();
  if (error) throw error;
  return flattenPoster(data as unknown as Record<string, unknown>);
}

export async function getPosterById(id: string): Promise<Poster | undefined> {
  const { data } = await supabase().from("posters").select(POSTER_SELECT).eq("id", id).maybeSingle();
  if (!data) return undefined;
  return flattenPoster(data as unknown as Record<string, unknown>);
}

export async function getPosters(options: { type?: PosterType; status?: PosterStatus; limit?: number } = {}): Promise<Poster[]> {
  let query = supabase().from("posters").select(POSTER_SELECT).order("created_at", { ascending: false });
  if (options.type) query = query.eq("type", options.type);
  if (options.status) query = query.eq("status", options.status);
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => flattenPoster(row as unknown as Record<string, unknown>));
}

export async function setPosterGenerated(id: string, imagePath: string): Promise<void> {
  const { error } = await supabase()
    .from("posters")
    .update({ status: "draft", image_path: imagePath, generated_at: new Date().toISOString(), error: null })
    .eq("id", id);
  if (error) throw error;
}

export async function setPosterFailed(id: string, errorMsg: string): Promise<void> {
  const { error } = await supabase().from("posters").update({ status: "failed", error: errorMsg }).eq("id", id);
  if (error) throw error;
}

export async function approvePoster(id: string): Promise<void> {
  const { error } = await supabase().from("posters").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markPosterPublished(id: string): Promise<void> {
  const { error } = await supabase().from("posters").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function posterExistsForFixture(fixtureId: number, type: PosterType): Promise<boolean> {
  const { data } = await supabase()
    .from("posters")
    .select("id")
    .eq("fixture_id", fixtureId)
    .eq("type", type)
    .neq("status", "failed")
    .limit(1);
  return (data ?? []).length > 0;
}

export async function posterExistsForWeek(weekStart: string): Promise<boolean> {
  const { data } = await supabase()
    .from("posters")
    .select("id")
    .eq("week_start", weekStart)
    .eq("type", "weekly_schedule")
    .neq("status", "failed")
    .limit(1);
  return (data ?? []).length > 0;
}
