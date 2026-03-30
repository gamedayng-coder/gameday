import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllCompetitions, getRecentSyncLogs, upsertCompetition } from "@/lib/sports-db";
import { FREE_TIER_COMPETITIONS } from "@/lib/football-data";
import SportsAdminClient from "./SportsAdminClient";

export const dynamic = "force-dynamic";

export default async function SportsAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Seed available competitions on first visit
  const existing = getAllCompetitions();
  if (existing.length === 0) {
    for (const c of FREE_TIER_COMPETITIONS) {
      upsertCompetition(c.external_id, c.name, c.country, null, null);
    }
  }

  const competitions = getAllCompetitions();
  const syncLogs = getRecentSyncLogs(20);

  return <SportsAdminClient competitions={competitions} syncLogs={syncLogs} />;
}
