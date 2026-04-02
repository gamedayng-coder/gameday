import { auth } from "@/auth";
import { deleteDataSource, getDataSourceById, updateDataSource, type AuthType } from "@/lib/data-sources-db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { name?: string; base_url?: string; api_key?: string; auth_type?: AuthType };
  const ds = updateDataSource(id, session.user.id, {
    ...(body.name !== undefined && { name: body.name.trim() }),
    ...(body.base_url !== undefined && { base_url: body.base_url.trim() }),
    ...(body.api_key !== undefined && { api_key: body.api_key.trim() }),
    ...(body.auth_type !== undefined && { auth_type: body.auth_type }),
  });
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...ds, api_key: "••••••••" });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = getDataSourceById(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  deleteDataSource(id, session.user.id);
  return NextResponse.json({ ok: true });
}
