import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getAllCompetitions,
  setCompetitionActive,
  upsertCompetition,
  getCompetitionByExternalId,
} from "@/lib/sports-db";
import { FREE_TIER_COMPETITIONS } from "@/lib/football-data";

// GET /api/sports/competitions
// Returns all competitions. Seeds free-tier list if none exist yet.
export async function GET() {
  // Seed known competitions on first call
  const existing = getAllCompetitions();
  if (existing.length === 0) {
    for (const c of FREE_TIER_COMPETITIONS) {
      upsertCompetition(c.external_id, c.name, c.country, null, null);
    }
  }
  return NextResponse.json(getAllCompetitions());
}

// PATCH /api/sports/competitions
// Body: { external_id: string; active: boolean }
// Toggle whether we follow a competition. Admin only.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { external_id?: string; active?: boolean };
  if (!body.external_id || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "external_id and active required" }, { status: 400 });
  }

  const comp = getCompetitionByExternalId(body.external_id);
  if (!comp) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  setCompetitionActive(body.external_id, body.active);
  return NextResponse.json(getCompetitionByExternalId(body.external_id));
}
