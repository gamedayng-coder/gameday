import { NextRequest, NextResponse } from "next/server";
import { validateAgentRequest } from "@/lib/agent-auth";
import {
  getActiveCompetitions,
  getCompetitionByExternalId,
  upsertCompetition,
  upsertTeam,
  upsertFixture,
  upsertStanding,
  logSync,
} from "@/lib/sports-db";
import {
  fetchCompetition,
  fetchTeams,
  fetchMatches,
  fetchStandings,
} from "@/lib/football-data";

// POST /api/agent/sync
// Triggers a sports data sync for all active competitions (or a specific one).
// Auth: Bearer token via AGENT_API_KEY env var or agent_api_keys table.
export async function POST(req: NextRequest) {
  const agent = validateAgentRequest(req);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let competitionCodes: string[];
  try {
    const body = await req.json() as { competition_code?: string };
    if (body.competition_code) {
      competitionCodes = [body.competition_code];
    } else {
      const active = getActiveCompetitions();
      competitionCodes = active.map((c) => c.external_id);
    }
  } catch {
    const active = getActiveCompetitions();
    competitionCodes = active.map((c) => c.external_id);
  }

  if (competitionCodes.length === 0) {
    return NextResponse.json({ message: "No active competitions to sync.", synced: 0 });
  }

  const results: Array<{ code: string; success: boolean; error?: string }> = [];

  for (const code of competitionCodes) {
    try {
      const fdComp = await fetchCompetition(code);
      const season = fdComp.currentSeason
        ? `${fdComp.currentSeason.startDate.slice(0, 4)}/${fdComp.currentSeason.endDate.slice(0, 4)}`
        : null;
      upsertCompetition(code, fdComp.name, fdComp.area?.name ?? null, fdComp.emblem ?? null, season);

      const comp = getCompetitionByExternalId(code)!;

      const teams = await fetchTeams(code);
      for (const t of teams) {
        upsertTeam(String(t.id), t.name, t.shortName ?? null, t.tla ?? null, t.crest ?? null);
      }

      const today = new Date();
      const inThirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const upcomingMatches = await fetchMatches(code, {
        dateFrom: today.toISOString().slice(0, 10),
        dateTo: inThirtyDays.toISOString().slice(0, 10),
      });
      for (const m of upcomingMatches) {
        const homeTeam = upsertTeam(String(m.homeTeam.id), m.homeTeam.name, m.homeTeam.shortName ?? null, m.homeTeam.tla ?? null, m.homeTeam.crest ?? null);
        const awayTeam = upsertTeam(String(m.awayTeam.id), m.awayTeam.name, m.awayTeam.shortName ?? null, m.awayTeam.tla ?? null, m.awayTeam.crest ?? null);
        const matchSeason = m.season ? `${m.season.startDate.slice(0, 4)}/${m.season.endDate.slice(0, 4)}` : season;
        upsertFixture(String(m.id), comp.id, homeTeam.id, awayTeam.id, m.utcDate, m.venue ?? null, m.status, m.score?.fullTime?.home ?? null, m.score?.fullTime?.away ?? null, m.matchday ?? null, matchSeason);
      }

      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentMatches = await fetchMatches(code, {
        dateFrom: thirtyDaysAgo.toISOString().slice(0, 10),
        dateTo: today.toISOString().slice(0, 10),
        status: "FINISHED",
      });
      for (const m of recentMatches) {
        const homeTeam = upsertTeam(String(m.homeTeam.id), m.homeTeam.name, m.homeTeam.shortName ?? null, m.homeTeam.tla ?? null, m.homeTeam.crest ?? null);
        const awayTeam = upsertTeam(String(m.awayTeam.id), m.awayTeam.name, m.awayTeam.shortName ?? null, m.awayTeam.tla ?? null, m.awayTeam.crest ?? null);
        const matchSeason = m.season ? `${m.season.startDate.slice(0, 4)}/${m.season.endDate.slice(0, 4)}` : season;
        upsertFixture(String(m.id), comp.id, homeTeam.id, awayTeam.id, m.utcDate, m.venue ?? null, m.status, m.score?.fullTime?.home ?? null, m.score?.fullTime?.away ?? null, m.matchday ?? null, matchSeason);
      }

      if (season) {
        const standingsData = await fetchStandings(code);
        const totalTable = standingsData.standings.find((s) => s.type === "TOTAL");
        if (totalTable) {
          for (const row of totalTable.table) {
            const team = upsertTeam(String(row.team.id), row.team.name, row.team.shortName ?? null, row.team.tla ?? null, row.team.crest ?? null);
            upsertStanding(comp.id, season, team.id, row.position, {
              played_games: row.playedGames, won: row.won, draw: row.draw, lost: row.lost,
              points: row.points, goals_for: row.goalsFor, goals_against: row.goalsAgainst, goal_difference: row.goalDifference,
            });
          }
        }
      }

      logSync(comp.id, "full", "success", null);
      results.push({ code, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const comp = getCompetitionByExternalId(code);
      logSync(comp?.id ?? null, "full", "error", message);
      results.push({ code, success: false, error: message });
    }
  }

  return NextResponse.json({ synced: results.filter((r) => r.success).length, results });
}
