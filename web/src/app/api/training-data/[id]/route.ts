import { auth } from "@/auth";
import { deleteTrainingDataItem } from "@/lib/training-data-db";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteTrainingDataItem(id, session.user.id);
  return NextResponse.json({ ok: true });
}
