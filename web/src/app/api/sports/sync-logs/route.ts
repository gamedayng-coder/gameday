import { NextResponse } from "next/server";
import { getRecentSyncLogs } from "@/lib/sports-db";

// GET /api/sports/sync-logs
export async function GET() {
  return NextResponse.json(await getRecentSyncLogs(20));
}
