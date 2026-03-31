import { getDb } from "@/lib/db";

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
  // Joined fields
  fixture_home_team?: string;
  fixture_away_team?: string;
  fixture_date?: string;
  fixture_competition?: string;
}

export function createPoster(
  id: string,
  type: PosterType,
  fixtureId: number | null,
  weekStart: string | null
): Poster {
  getDb()
    .prepare(
      "INSERT INTO posters (id, type, fixture_id, week_start) VALUES (?, ?, ?, ?)"
    )
    .run(id, type, fixtureId, weekStart);
  return getPosterById(id)!;
}

export function getPosterById(id: string): Poster | undefined {
  return getDb()
    .prepare(`
      SELECT p.*,
        ht.name AS fixture_home_team,
        at.name AS fixture_away_team,
        sf.match_date AS fixture_date,
        sc.name AS fixture_competition
      FROM posters p
      LEFT JOIN sports_fixtures sf ON sf.id = p.fixture_id
      LEFT JOIN sports_teams ht ON ht.id = sf.home_team_id
      LEFT JOIN sports_teams at ON at.id = sf.away_team_id
      LEFT JOIN sports_competitions sc ON sc.id = sf.competition_id
      WHERE p.id = ?
    `)
    .get(id) as Poster | undefined;
}

export function getPosters(options: {
  type?: PosterType;
  status?: PosterStatus;
  limit?: number;
} = {}): Poster[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.type) {
    conditions.push("p.type = ?");
    params.push(options.type);
  }
  if (options.status) {
    conditions.push("p.status = ?");
    params.push(options.status);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const limit = options.limit ? `LIMIT ${options.limit}` : "";

  return getDb()
    .prepare(`
      SELECT p.*,
        ht.name AS fixture_home_team,
        at.name AS fixture_away_team,
        sf.match_date AS fixture_date,
        sc.name AS fixture_competition
      FROM posters p
      LEFT JOIN sports_fixtures sf ON sf.id = p.fixture_id
      LEFT JOIN sports_teams ht ON ht.id = sf.home_team_id
      LEFT JOIN sports_teams at ON at.id = sf.away_team_id
      LEFT JOIN sports_competitions sc ON sc.id = sf.competition_id
      ${where}
      ORDER BY p.created_at DESC
      ${limit}
    `)
    .all(...params) as Poster[];
}

export function setPosterGenerated(id: string, imagePath: string): void {
  getDb()
    .prepare(
      "UPDATE posters SET status='draft', image_path=?, generated_at=datetime('now'), error=NULL WHERE id=?"
    )
    .run(imagePath, id);
}

export function setPosterFailed(id: string, error: string): void {
  getDb()
    .prepare("UPDATE posters SET status='failed', error=? WHERE id=?")
    .run(error, id);
}

export function approvePoster(id: string): void {
  getDb()
    .prepare("UPDATE posters SET status='approved', approved_at=datetime('now') WHERE id=?")
    .run(id);
}

export function markPosterPublished(id: string): void {
  getDb()
    .prepare("UPDATE posters SET status='published', published_at=datetime('now') WHERE id=?")
    .run(id);
}

// Check if a game_day poster already exists for this fixture
export function posterExistsForFixture(fixtureId: number, type: PosterType): boolean {
  const row = getDb()
    .prepare("SELECT id FROM posters WHERE fixture_id=? AND type=? AND status != 'failed'")
    .get(fixtureId, type);
  return row !== undefined;
}

// Check if a weekly_schedule poster already exists for this week
export function posterExistsForWeek(weekStart: string): boolean {
  const row = getDb()
    .prepare("SELECT id FROM posters WHERE week_start=? AND type='weekly_schedule' AND status != 'failed'")
    .get(weekStart);
  return row !== undefined;
}
