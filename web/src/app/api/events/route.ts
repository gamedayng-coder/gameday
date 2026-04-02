import { auth } from "@/auth";
import { createManualEvent, getManualEvents, type InputMode } from "@/lib/manual-events-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const templatesOnly = searchParams.get("templates") === "true";
  return NextResponse.json(getManualEvents(session.user.id, templatesOnly));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as {
    title?: string;
    event_data?: Record<string, unknown>;
    raw_input?: string;
    input_mode?: InputMode;
    is_template?: boolean;
  };
  if (!body.title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const event = createManualEvent(
    randomUUID(),
    session.user.id,
    body.title.trim(),
    body.event_data ?? {},
    body.raw_input ?? null,
    body.input_mode ?? "json",
    body.is_template ?? false
  );
  return NextResponse.json(event, { status: 201 });
}
