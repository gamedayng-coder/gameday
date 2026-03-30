import { NextRequest, NextResponse } from "next/server";
import { getStandings } from "@/lib/sports-db";

// GET /api/sports/standings
// Query params:
//   competition  - competition external_id (required, e.g. "PL")
//   season       - season string (optional, e.g. "2024/2025" — defaults to latest)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competition = searchParams.get("competition");
  const season = searchParams.get("season") ?? undefined;

  if (!competition) {
    return NextResponse.json({ error: "competition param required" }, { status: 400 });
  }

  const standings = getStandings(competition, season);
  return NextResponse.json(standings);
}
