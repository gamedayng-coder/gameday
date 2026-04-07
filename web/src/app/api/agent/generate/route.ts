import { NextRequest, NextResponse } from "next/server";
import { validateAgentRequest } from "@/lib/agent-auth";
import { getFixtures } from "@/lib/sports-db";
import { createContentItem, updateContentItem, getContentItems } from "@/lib/content-db";
import { randomUUID } from "crypto";

// POST /api/agent/generate
// Creates draft content items for upcoming fixtures (next N days) that don't
// already have a text-only content item with the same caption.
// Optionally auto-approves them so they're ready for publish.
//
// Body (optional):
//   { days?: number (default 7), approve?: boolean (default false) }
//
// Returns: { created: number, skipped: number, auto_approved: boolean, items: object[] }
export async function POST(req: NextRequest) {
  const agent = await validateAgentRequest(req);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { days?: number; approve?: boolean };
  const days = Math.min(Math.max(body.days ?? 7, 1), 30);
  const autoApprove = body.approve === true;

  const today = new Date();
  const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  const fixtures = await getFixtures({
    status: "SCHEDULED",
    dateFrom: today.toISOString().slice(0, 10),
    dateTo: future.toISOString().slice(0, 10),
    limit: 50,
  });

  if (fixtures.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, auto_approved: autoApprove, items: [] });
  }

  // Build set of captions already in draft/approved/scheduled for this user
  const allItems = await getContentItems(agent.userId);
  const existingCaptions = new Set(
    allItems
      .filter((c) => !["discarded", "published"].includes(c.status))
      .map((c) => c.caption)
  );

  const createdItems: object[] = [];
  let skipped = 0;

  for (const fixture of fixtures) {
    const matchDate = new Date(fixture.match_date);
    const dateStr = matchDate.toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    });
    const timeStr = matchDate.toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    });

    const homeTeam = fixture.home_team_name ?? "Home Team";
    const awayTeam = fixture.away_team_name ?? "Away Team";
    const competition = fixture.competition_name ?? "Football";

    const caption = `${homeTeam} vs ${awayTeam} | ${competition} | ${dateStr} ${timeStr} UTC`;

    if (existingCaptions.has(caption)) {
      skipped++;
      continue;
    }

    const platformCaptions = {
      twitter: `${homeTeam} vs ${awayTeam}\n${competition}\n${dateStr} ${timeStr} UTC\n\n#Football #${competition.replace(/\s+/g, "")}`,
      telegram: caption,
      linkedin: `Upcoming match: ${caption}`,
    };

    const id = randomUUID();
    let item = await createContentItem(id, agent.userId, null, null, caption, platformCaptions);
    if (autoApprove) {
      item = (await updateContentItem(id, agent.userId, { status: "approved" })) ?? item;
    }
    createdItems.push(item as object);
    existingCaptions.add(caption);
  }

  return NextResponse.json({
    created: createdItems.length,
    skipped,
    auto_approved: autoApprove,
    items: createdItems,
  });
}
