import { NextRequest, NextResponse } from "next/server";
import { getFixtures } from "@/lib/sports-db";

// GET /api/sports/fixtures
// Query params:
//   competition  - competition external_id (e.g. "PL")
//   status       - match status (e.g. "SCHEDULED", "FINISHED", "IN_PLAY") — comma-separated
//   dateFrom     - ISO date string (YYYY-MM-DD)
//   dateTo       - ISO date string (YYYY-MM-DD)
//   limit        - max results (default 50)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competition = searchParams.get("competition") ?? undefined;
  const statusParam = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const status = statusParam ? statusParam.split(",") : undefined;

  const fixtures = getFixtures({ competitionExternalId: competition, status, dateFrom, dateTo, limit });
  return NextResponse.json(fixtures);
}
