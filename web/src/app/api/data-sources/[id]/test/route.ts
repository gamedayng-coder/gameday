import { auth } from "@/auth";
import { getDataSourceById } from "@/lib/data-sources-db";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ds = await getDataSourceById(id, session.user.id);
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build auth header based on auth_type
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  switch (ds.auth_type) {
    case "bearer":
      headers["Authorization"] = `Bearer ${ds.api_key}`;
      break;
    case "x-auth-token":
      headers["X-Auth-Token"] = ds.api_key;
      break;
    case "api-key":
      headers["X-API-Key"] = ds.api_key;
      break;
    case "basic":
      headers["Authorization"] = `Basic ${Buffer.from(ds.api_key).toString("base64")}`;
      break;
  }

  try {
    const res = await fetch(ds.base_url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    let preview: unknown = text;
    try { preview = JSON.parse(text); } catch { /* not JSON, return as text */ }
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      preview: typeof preview === "object" ? JSON.stringify(preview, null, 2).slice(0, 2000) : text.slice(0, 2000),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
