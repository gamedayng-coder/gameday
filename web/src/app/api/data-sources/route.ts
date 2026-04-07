import { auth } from "@/auth";
import { createDataSource, getDataSources, type AuthType } from "@/lib/data-sources-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sources = await getDataSources(session.user.id);
  // Mask api_key in list response
  return NextResponse.json(sources.map((s) => ({ ...s, api_key: s.api_key ? "••••••••" : "" })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { name?: string; base_url?: string; api_key?: string; auth_type?: AuthType };
  if (!body.name || !body.base_url || !body.api_key) {
    return NextResponse.json({ error: "name, base_url, and api_key are required" }, { status: 400 });
  }
  const ds = await createDataSource(
    randomUUID(),
    session.user.id,
    body.name.trim(),
    body.base_url.trim(),
    body.api_key.trim(),
    body.auth_type ?? "bearer"
  );
  return NextResponse.json({ ...ds, api_key: "••••••••" }, { status: 201 });
}
