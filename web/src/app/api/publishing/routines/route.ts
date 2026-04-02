import { auth } from "@/auth";
import { createRoutine, getRoutines, type PublishChannel } from "@/lib/publishing-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getRoutines(session.user.id));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as {
    name?: string;
    content_type?: string;
    channels?: PublishChannel[];
    schedule_rule?: object;
    max_per_day?: number;
    timezone?: string;
  };
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const routine = createRoutine(
    randomUUID(),
    session.user.id,
    body.name.trim(),
    body.content_type ?? "any",
    body.channels ?? [],
    body.schedule_rule ?? { type: "immediate" },
    body.max_per_day ?? 5,
    body.timezone ?? "UTC"
  );
  return NextResponse.json(routine, { status: 201 });
}
