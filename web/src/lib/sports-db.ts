import { supabase } from "@/lib/supabase";

export interface Competition {
  id: number;
  external_id: string;
  name: string;
  country: string | null;
  emblem_url: string | null;
  active: boolean;
  current_season: string | null;
  created_at: string;
}

export interface Team {
  id: number;
  external_id: string;
  name: string;
  short_name: string | null;
  tla: string | null;
  crest_url: string | null;
  created_at: string;
}

export interface Fixture {
  id: number;
  external_id: string;
  competition_id: number;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  matchday: number | null;
  season: string | null;
  created_at: string;
  updated_at: string;
  competition_name?: string;
  home_team_name?: string;
  home_team_crest?: string;
  away_team_name?: string;
  away_team_crest?: string;
}

export interface Standing {
  id: number;
  competition_id: number;
  season: string;
  team_id: number;
  position: number;
  played_games: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  updated_at: string;
  team_name?: string;
  team_crest?: string;
  team_tla?: string;
}

export interface SyncLog {
  id: number;
  competition_id: number | null;
  sync_type: string;
  status: string;
  message: string | null;
  synced_at: string;
}

// ── Competitions ──────────────────────────────────────────────────────────────

export async function getAllCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase()
    .from("sports_competitions")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getActiveCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase()
    .from("sports_competitions")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCompetitionByExternalId(externalId: string): Promise<Competition | undefined> {
  const { data } = await supabase()
    .from("sports_competitions")
    .select("*")
    .eq("external_id", externalId)
    .single();
  return data ?? undefined;
}

export async function upsertCompetition(
  externalId: string,
  name: string,
  country: string | null,
  emblemUrl: string | null,
  currentSeason: string | null
): Promise<Competition> {
  const { data, error } = await supabase()
    .from("sports_competitions")
    .upsert(
      { external_id: externalId, name, country, emblem_url: emblemUrl, current_season: currentSeason },
      { onConflict: "external_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setCompetitionActive(externalId: string, active: boolean): Promise<void> {
  const { error } = await supabase()
    .from("sports_competitions")
    .update({ active })
    .eq("external_id", externalId);
  if (error) throw error;
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function upsertTeam(
  externalId: string,
  name: string,
  shortName: string | null,
  tla: string | null,
  crestUrl: string | null
): Promise<Team> {
  const { data, error } = await supabase()
    .from("sports_teams")
    .upsert(
      { external_id: externalId, name, short_name: shortName, tla, crest_url: crestUrl },
      { onConflict: "external_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export async function upsertFixture(
  externalId: string,
  competitionId: number,
  homeTeamId: number,
  awayTeamId: number,
  matchDate: string,
  venue: string | null,
  status: string,
  homeScore: number | null,
  awayScore: number | null,
  matchday: number | null,
  season: string | null
): Promise<void> {
  const { error } = await supabase()
    .from("sports_fixtures")
    .upsert(
      {
        external_id: externalId,
        competition_id: competitionId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: matchDate,
        venue,
        status,
        home_score: homeScore,
        away_score: awayScore,
        matchday,
        season,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    );
  if (error) throw error;
}

const FIXTURE_SELECT = `
  *,
  competition:sports_competitions!sports_fixtures_competition_id_fkey(name),
  home_team:sports_teams!sports_fixtures_home_team_id_fkey(name, crest_url),
  away_team:sports_teams!sports_fixtures_away_team_id_fkey(name, crest_url)
`;

function flattenFixture(row: Record<string, unknown>): Fixture {
  const comp = row.competition as { name: string } | null;
  const ht = row.home_team as { name: string; crest_url: string | null } | null;
  const at = row.away_team as { name: string; crest_url: string | null } | null;
  const { competition: _c, home_team: _ht, away_team: _at, ...rest } = row;
  return {
    ...(rest as unknown as Fixture),
    competition_name: comp?.name,
    home_team_name: ht?.name,
    home_team_crest: ht?.crest_url ?? undefined,
    away_team_name: at?.name,
    away_team_crest: at?.crest_url ?? undefined,
  };
}

export async function getFixtures(options: {
  competitionExternalId?: string;
  status?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<Fixture[]> {
  let query = supabase()
    .from("sports_fixtures")
    .select(FIXTURE_SELECT)
    .order("match_date", { ascending: true });

  if (options.competitionExternalId) {
    const comp = await getCompetitionByExternalId(options.competitionExternalId);
    if (!comp) return [];
    query = query.eq("competition_id", comp.id);
  }
  if (options.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    query = query.in("status", statuses);
  }
  if (options.dateFrom) query = query.gte("match_date", options.dateFrom);
  if (options.dateTo) query = query.lte("match_date", options.dateTo);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => flattenFixture(row as unknown as Record<string, unknown>));
}

// ── Standings ─────────────────────────────────────────────────────────────────

export async function upsertStanding(
  competitionId: number,
  season: string,
  teamId: number,
  position: number,
  stats: {
    played_games: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
  }
): Promise<void> {
  const { error } = await supabase()
    .from("sports_standings")
    .upsert(
      { competition_id: competitionId, season, team_id: teamId, position, ...stats, updated_at: new Date().toISOString() },
      { onConflict: "competition_id,season,team_id" }
    );
  if (error) throw error;
}

export async function getStandings(competitionExternalId: string, season?: string): Promise<Standing[]> {
  const comp = await getCompetitionByExternalId(competitionExternalId);
  if (!comp) return [];

  let effectiveSeason = season;
  if (!effectiveSeason) {
    const { data: seasons } = await supabase()
      .from("sports_standings")
      .select("season")
      .eq("competition_id", comp.id)
      .order("season", { ascending: false })
      .limit(1);
    if (!seasons || seasons.length === 0) return [];
    effectiveSeason = seasons[0].season as string;
  }

  const { data, error } = await supabase()
    .from("sports_standings")
    .select("*, team:sports_teams!sports_standings_team_id_fkey(name, crest_url, tla)")
    .eq("competition_id", comp.id)
    .eq("season", effectiveSeason)
    .order("position", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const team = r.team as { name: string; crest_url: string | null; tla: string | null } | null;
    const { team: _t, ...rest } = r;
    return {
      ...(rest as unknown as Standing),
      team_name: team?.name,
      team_crest: team?.crest_url ?? undefined,
      team_tla: team?.tla ?? undefined,
    };
  });
}

// ── Sync Log ──────────────────────────────────────────────────────────────────

export async function logSync(
  competitionId: number | null,
  syncType: string,
  status: "success" | "error",
  message: string | null
): Promise<void> {
  const { error } = await supabase()
    .from("sports_sync_log")
    .insert({ competition_id: competitionId, sync_type: syncType, status, message });
  if (error) throw error;
}

export async function getRecentSyncLogs(limit = 20): Promise<SyncLog[]> {
  const { data, error } = await supabase()
    .from("sports_sync_log")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
