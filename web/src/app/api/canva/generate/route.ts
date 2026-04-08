import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateAgentRequest } from "@/lib/agent-auth";
import { generateDesign, type CanvaTemplateType, type EventDesignData } from "@/lib/canva-client";
import { getValidCanvaToken } from "@/lib/canva-db";
import { supabase } from "@/lib/supabase";

// POST /api/canva/generate
// Accepts event data + template type and generates a design via Canva Connect.
// Returns the Canva design URL and an exported image URL (hosted on Canva CDN).
//
// Callable by:
//   - Authenticated web users (session cookie)
//   - Agent API key (Authorization: Bearer <key>)
//
// Body:
//   {
//     templateType: "game_day" | "result" | "weekly_schedule" | "general",
//     fixtureId?: number,          // auto-populate from sports DB if provided
//     homeTeam?: string,
//     awayTeam?: string,
//     score?: string,              // e.g. "2-1"
//     matchDate?: string,          // ISO datetime
//     matchTime?: string,          // e.g. "15:00 UTC"
//     competition?: string,
//     venue?: string,
//     weekLabel?: string,          // for weekly_schedule
//     title?: string,              // design title in Canva
//   }
//
// Returns:
//   { designId, viewUrl, exportUrl, templateType }

const VALID_TEMPLATE_TYPES: CanvaTemplateType[] = ["game_day", "result", "weekly_schedule", "general"];

export async function POST(req: NextRequest) {
  // Resolve caller identity — agent key takes precedence over session
  let userId: string | undefined;

  const agent = await validateAgentRequest(req);
  if (agent) {
    userId = agent.userId;
  } else {
    const session = await auth();
    userId = session?.user?.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const templateType = body.templateType as CanvaTemplateType | undefined;
  if (!templateType || !VALID_TEMPLATE_TYPES.includes(templateType)) {
    return NextResponse.json(
      { error: `templateType must be one of: ${VALID_TEMPLATE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // If fixtureId provided, pull data from sports DB to fill missing fields
  let eventData: EventDesignData = { templateType };

  if (typeof body.fixtureId === "number") {
    const { data: fixtureRow } = await supabase()
      .from("sports_fixtures")
      .select(`
        *,
        competition:sports_competitions!sports_fixtures_competition_id_fkey(name),
        home_team:sports_teams!sports_fixtures_home_team_id_fkey(name),
        away_team:sports_teams!sports_fixtures_away_team_id_fkey(name)
      `)
      .eq("id", body.fixtureId)
      .maybeSingle();

    if (fixtureRow) {
      const comp = fixtureRow.competition as { name: string } | null;
      const ht = fixtureRow.home_team as { name: string } | null;
      const at = fixtureRow.away_team as { name: string } | null;
      const matchDate = new Date(fixtureRow.match_date as string);
      eventData.homeTeam = ht?.name;
      eventData.awayTeam = at?.name;
      eventData.competition = comp?.name;
      eventData.venue = (fixtureRow.venue as string | null) ?? undefined;
      eventData.matchDate = matchDate.toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      });
      eventData.matchTime = matchDate.toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "UTC",
      });
      const homeScore = fixtureRow.home_score as number | null;
      const awayScore = fixtureRow.away_score as number | null;
      if (homeScore != null && awayScore != null) {
        eventData.score = `${homeScore}-${awayScore}`;
      }
    }
  }

  // Explicit body fields override fixture lookups
  if (typeof body.homeTeam === "string") eventData.homeTeam = body.homeTeam;
  if (typeof body.awayTeam === "string") eventData.awayTeam = body.awayTeam;
  if (typeof body.score === "string") eventData.score = body.score;
  if (typeof body.matchDate === "string") eventData.matchDate = body.matchDate;
  if (typeof body.matchTime === "string") eventData.matchTime = body.matchTime;
  if (typeof body.competition === "string") eventData.competition = body.competition;
  if (typeof body.venue === "string") eventData.venue = body.venue;
  if (typeof body.weekLabel === "string") eventData.weekLabel = body.weekLabel;
  if (typeof body.title === "string") eventData.title = body.title;

  // Get valid (possibly refreshed) Canva access token for this user
  let accessToken: string;
  try {
    const result = await getValidCanvaToken(userId);
    accessToken = result.accessToken;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Canva not connected";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const result = await generateDesign(accessToken, eventData);
    return NextResponse.json({ ...result, templateType });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Design generation failed";
    // Surface template-not-configured errors with a clear 400
    if (msg.includes("No Canva template configured")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
