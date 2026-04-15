import { auth } from "@/auth";
import { getBrands, createBrand, deleteBrand } from "@/lib/training-data-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getBrands(session.user.id));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { name?: string };
  if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const brand = await createBrand(randomUUID(), session.user.id, body.name.trim());
  return NextResponse.json(brand, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteBrand(id, session.user.id);
  return NextResponse.json({ ok: true });
}
