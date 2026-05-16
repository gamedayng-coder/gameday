import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';

type Params = { params: { id: string; eventId: string } };

// DELETE /api/brands/[id]/events/[eventId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_events')
    .delete()
    .eq('id', params.eventId)
    .eq('brand_id', params.id); // enforce brand scope

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

// PATCH /api/brands/[id]/events/[eventId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, event_type, event_date, description } = body as Record<string, string | undefined>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined)        patch.name        = name.trim();
  if (event_type !== undefined)  patch.event_type  = event_type.trim() || 'general';
  if (event_date !== undefined)  patch.event_date  = event_date;
  if (description !== undefined) patch.description = description?.trim() || null;

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_events')
    .update(patch)
    .eq('id', params.eventId)
    .eq('brand_id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
