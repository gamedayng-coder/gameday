import { auth } from "@/auth";
import { deleteSchedule, getSchedules } from "@/lib/publishing-db";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // Verify ownership via a lookup
  const all = getSchedules(session.user.id);
  const owned = all.find((s) => s.id === id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  deleteSchedule(id, session.user.id);
  return NextResponse.json({ ok: true });
}
