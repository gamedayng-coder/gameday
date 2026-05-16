import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';

type Params = { params: { id: string } };

// GET /api/brands/[id]/events — list events for a brand, ordered by event_date desc
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_events')
    .select('*')
    .eq('brand_id', params.id)
    .order('event_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/brands/[id]/events — create a new event
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, event_type, event_date, description } = body as Record<string, string | undefined>;

  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!event_date) return NextResponse.json({ error: 'event_date is required' }, { status: 400 });

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_events')
    .insert({
      id: uuidv4(),
      brand_id: params.id,
      name: name.trim(),
      event_type: event_type?.trim() || 'general',
      event_date,
      description: description?.trim() || null,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
