import { auth } from "@/auth";
import { createSchedule, getSchedules, type PublishChannel } from "@/lib/publishing-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const isDryRun = searchParams.get("dry_run") === "true" ? true : searchParams.get("dry_run") === "false" ? false : undefined;
  const status = searchParams.get("status") ?? undefined;
  return NextResponse.json(getSchedules(session.user.id, { isDryRun, status, limit: 100 }));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as {
    content_item_id?: string | null;
    channel?: PublishChannel;
    scheduled_at?: string;
    is_dry_run?: boolean;
  };
  if (!body.channel || !body.scheduled_at) {
    return NextResponse.json({ error: "channel and scheduled_at are required" }, { status: 400 });
  }
  const schedule = createSchedule(
    randomUUID(),
    session.user.id,
    body.content_item_id ?? null,
    body.channel,
    body.scheduled_at,
    body.is_dry_run ?? false
  );
  return NextResponse.json(schedule, { status: 201 });
}
