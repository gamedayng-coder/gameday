import { auth } from "@/auth";
import { deleteRoutine, getRoutineById, updateRoutine, type PublishChannel } from "@/lib/publishing-db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    content_type?: string;
    channels?: PublishChannel[];
    schedule_rule?: object;
    max_per_day?: number;
    timezone?: string;
    enabled?: number;
  };
  const updated = updateRoutine(id, session.user.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = getRoutineById(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  deleteRoutine(id, session.user.id);
  return NextResponse.json({ ok: true });
}
