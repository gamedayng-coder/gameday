import { auth } from "@/auth";
import { deleteManualEvent, getManualEventById, updateManualEvent, type InputMode } from "@/lib/manual-events-db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as {
    title?: string;
    event_data?: Record<string, unknown>;
    raw_input?: string | null;
    input_mode?: InputMode;
    is_template?: boolean;
  };
  const updated = await updateManualEvent(id, session.user.id, {
    ...(body.title !== undefined && { title: body.title.trim() }),
    ...(body.event_data !== undefined && { event_data: body.event_data }),
    ...(body.raw_input !== undefined && { raw_input: body.raw_input }),
    ...(body.input_mode !== undefined && { input_mode: body.input_mode }),
    ...(body.is_template !== undefined && { is_template: body.is_template }),
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getManualEventById(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteManualEvent(id, session.user.id);
  return NextResponse.json({ ok: true });
}
