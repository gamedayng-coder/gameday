import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUser } from '../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../lib/supabase/service';
import { Brand } from '../../../db/schema';

function isInternalRequest(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get('x-internal-key') === key;
}

/** GET /api/brands — list all brands (id, name, created_at, updated_at only). */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user && !isInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brands')
    .select('id, name, created_at, updated_at')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/brands — create a new brand. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: '`name` is required' }, { status: 400 });
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brands')
    .insert({ id: randomUUID(), name: body.name.trim() })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Brand, { status: 201 });
}
