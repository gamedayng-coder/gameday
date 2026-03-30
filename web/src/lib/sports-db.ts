import { getDb } from "@/lib/db";

export interface Competition {
  id: number;
  external_id: string;
  name: string;
  country: string | null;
  emblem_url: string | null;
  active: number;
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
  // Joined fields
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
  // Joined fields
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

export function getAllCompetitions(): Competition[] {
  return getDb()
    .prepare("SELECT * FROM sports_competitions ORDER BY name ASC")
    .all() as Competition[];
}

export function getActiveCompetitions(): Competition[] {
  return getDb()
    .prepare("SELECT * FROM sports_competitions WHERE active = 1 ORDER BY name ASC")
    .all() as Competition[];
}

export function getCompetitionByExternalId(externalId: string): Competition | undefined {
  return getDb()
    .prepare("SELECT * FROM sports_competitions WHERE external_id = ?")
    .get(externalId) as Competition | undefined;
}

export function upsertCompetition(
  externalId: string,
  name: string,
  country: string | null,
  emblemUrl: string | null,
  currentSeason: string | null
): Competition {
  const db = getDb();
  const existing = getCompetitionByExternalId(externalId);
  if (existing) {
    db.prepare(
      "UPDATE sports_competitions SET name=?, country=?, emblem_url=?, current_season=? WHERE external_id=?"
    ).run(name, country, emblemUrl, currentSeason, externalId);
  } else {
    db.prepare(
      "INSERT INTO sports_competitions (external_id, name, country, emblem_url, current_season) VALUES (?,?,?,?,?)"
    ).run(externalId, name, country, emblemUrl, currentSeason);
  }
  return getCompetitionByExternalId(externalId)!;
}

export function setCompetitionActive(externalId: string, active: boolean): void {
  getDb()
    .prepare("UPDATE sports_competitions SET active=? WHERE external_id=?")
    .run(active ? 1 : 0, externalId);
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export function upsertTeam(
  externalId: string,
  name: string,
  shortName: string | null,
  tla: string | null,
  crestUrl: string | null
): Team {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM sports_teams WHERE external_id = ?")
    .get(externalId) as Team | undefined;
  if (existing) {
    db.prepare(
      "UPDATE sports_teams SET name=?, short_name=?, tla=?, crest_url=? WHERE external_id=?"
    ).run(name, shortName, tla, crestUrl, externalId);
    return db.prepare("SELECT * FROM sports_teams WHERE external_id=?").get(externalId) as Team;
  } else {
    db.prepare(
      "INSERT INTO sports_teams (external_id, name, short_name, tla, crest_url) VALUES (?,?,?,?,?)"
    ).run(externalId, name, shortName, tla, crestUrl);
    return db.prepare("SELECT * FROM sports_teams WHERE external_id=?").get(externalId) as Team;
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export function upsertFixture(
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
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO sports_fixtures
      (external_id, competition_id, home_team_id, away_team_id, match_date, venue, status, home_score, away_score, matchday, season, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(external_id) DO UPDATE SET
      status=excluded.status,
      home_score=excluded.home_score,
      away_score=excluded.away_score,
      match_date=excluded.match_date,
      venue=excluded.venue,
      matchday=excluded.matchday,
      season=excluded.season,
      updated_at=excluded.updated_at
  `).run(externalId, competitionId, homeTeamId, awayTeamId, matchDate, venue, status, homeScore, awayScore, matchday, season, now);
}

export function getFixtures(options: {
  competitionExternalId?: string;
  status?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Fixture[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.competitionExternalId) {
    conditions.push("sc.external_id = ?");
    params.push(options.competitionExternalId);
  }
  if (options.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    conditions.push(`sf.status IN (${statuses.map(() => "?").join(",")})`);
    params.push(...statuses);
  }
  if (options.dateFrom) {
    conditions.push("sf.match_date >= ?");
    params.push(options.dateFrom);
  }
  if (options.dateTo) {
    conditions.push("sf.match_date <= ?");
    params.push(options.dateTo);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const limit = options.limit ? `LIMIT ${options.limit}` : "";

  return db.prepare(`
    SELECT sf.*,
      sc.name AS competition_name,
      ht.name AS home_team_name, ht.crest_url AS home_team_crest,
      at.name AS away_team_name, at.crest_url AS away_team_crest
    FROM sports_fixtures sf
    JOIN sports_competitions sc ON sc.id = sf.competition_id
    JOIN sports_teams ht ON ht.id = sf.home_team_id
    JOIN sports_teams at ON at.id = sf.away_team_id
    ${where}
    ORDER BY sf.match_date ASC
    ${limit}
  `).all(...params) as Fixture[];
}

// ── Standings ─────────────────────────────────────────────────────────────────

export function upsertStanding(
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
): void {
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO sports_standings
      (competition_id, season, team_id, position, played_games, won, draw, lost, points, goals_for, goals_against, goal_difference, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(competition_id, season, team_id) DO UPDATE SET
      position=excluded.position,
      played_games=excluded.played_games,
      won=excluded.won,
      draw=excluded.draw,
      lost=excluded.lost,
      points=excluded.points,
      goals_for=excluded.goals_for,
      goals_against=excluded.goals_against,
      goal_difference=excluded.goal_difference,
      updated_at=excluded.updated_at
  `).run(
    competitionId, season, teamId, position,
    stats.played_games, stats.won, stats.draw, stats.lost, stats.points,
    stats.goals_for, stats.goals_against, stats.goal_difference, now
  );
}

export function getStandings(competitionExternalId: string, season?: string): Standing[] {
  const db = getDb();
  const params: (string | number)[] = [competitionExternalId];
  let seasonClause = "";
  if (season) {
    seasonClause = "AND ss.season = ?";
    params.push(season);
  } else {
    // Get the latest season automatically
    seasonClause = `AND ss.season = (
      SELECT season FROM sports_standings ss2
      JOIN sports_competitions sc2 ON sc2.id = ss2.competition_id
      WHERE sc2.external_id = ?
      ORDER BY season DESC LIMIT 1
    )`;
    params.push(competitionExternalId);
  }

  return db.prepare(`
    SELECT ss.*,
      st.name AS team_name, st.crest_url AS team_crest, st.tla AS team_tla
    FROM sports_standings ss
    JOIN sports_competitions sc ON sc.id = ss.competition_id
    JOIN sports_teams st ON st.id = ss.team_id
    WHERE sc.external_id = ? ${seasonClause}
    ORDER BY ss.position ASC
  `).all(...params) as Standing[];
}

// ── Sync Log ──────────────────────────────────────────────────────────────────

export function logSync(
  competitionId: number | null,
  syncType: string,
  status: "success" | "error",
  message: string | null
): void {
  getDb()
    .prepare("INSERT INTO sports_sync_log (competition_id, sync_type, status, message) VALUES (?,?,?,?)")
    .run(competitionId, syncType, status, message);
}

export function getRecentSyncLogs(limit = 20): SyncLog[] {
  return getDb()
    .prepare("SELECT * FROM sports_sync_log ORDER BY synced_at DESC LIMIT ?")
    .all(limit) as SyncLog[];
}
