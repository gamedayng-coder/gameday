// football-data.org v4 API client
// Free tier: 10 req/min, competitions: PL, BL1, SA, PD, FL1, CL, WC
// Requires FOOTBALL_DATA_API_KEY in environment

const BASE_URL = "https://api.football-data.org/v4";

// These are the competitions available on the free tier of football-data.org
export const FREE_TIER_COMPETITIONS = [
  { external_id: "PL", name: "Premier League", country: "England" },
  { external_id: "BL1", name: "Bundesliga", country: "Germany" },
  { external_id: "SA", name: "Serie A", country: "Italy" },
  { external_id: "PD", name: "Primera Division", country: "Spain" },
  { external_id: "FL1", name: "Ligue 1", country: "France" },
  { external_id: "CL", name: "UEFA Champions League", country: "Europe" },
  { external_id: "WC", name: "FIFA World Cup", country: "World" },
];

function getApiKey(): string {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is not configured");
  return key;
}

async function apiFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": getApiKey() },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`football-data.org ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Competitions ──────────────────────────────────────────────────────────────

export interface FDCompetition {
  id: number;
  code: string;
  name: string;
  emblem: string | null;
  area: { name: string };
  currentSeason?: { startDate: string; endDate: string; currentMatchday: number | null } | null;
}

export async function fetchCompetition(code: string): Promise<FDCompetition> {
  const data = await apiFetch(`/competitions/${code}`) as FDCompetition;
  return data;
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string | null;
}

export async function fetchTeams(competitionCode: string): Promise<FDTeam[]> {
  const data = await apiFetch(`/competitions/${competitionCode}/teams`) as { teams: FDTeam[] };
  return data.teams;
}

// ── Matches ───────────────────────────────────────────────────────────────────

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string | null };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  venue: string | null;
  season: { startDate: string; endDate: string };
}

export async function fetchMatches(
  competitionCode: string,
  options: { dateFrom?: string; dateTo?: string; status?: string } = {}
): Promise<FDMatch[]> {
  const params = new URLSearchParams();
  if (options.dateFrom) params.set("dateFrom", options.dateFrom);
  if (options.dateTo) params.set("dateTo", options.dateTo);
  if (options.status) params.set("status", options.status);
  const query = params.toString() ? `?${params}` : "";
  const data = await apiFetch(`/competitions/${competitionCode}/matches${query}`) as { matches: FDMatch[] };
  return data.matches;
}

// ── Standings ─────────────────────────────────────────────────────────────────

export interface FDStandingRow {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FDStandingsResponse {
  season: { startDate: string; endDate: string };
  standings: Array<{ type: string; table: FDStandingRow[] }>;
}

export async function fetchStandings(competitionCode: string): Promise<FDStandingsResponse> {
  return await apiFetch(`/competitions/${competitionCode}/standings`) as FDStandingsResponse;
}
