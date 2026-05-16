import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { BrandTemplate, TemplateKind } from '../../../../../db/schema';

type Params = { params: { id: string } };

const VALID_KINDS: TemplateKind[] = ['poster', 'caption'];
const VALID_POSTER_TYPES = ['match-day', 'result', 'weekly-schedule', 'custom'];
const VALID_PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'telegram'];

function isInternalRequest(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get('x-internal-key') === key;
}

/** GET /api/brands/[id]/templates — list templates, optional ?kind=poster|caption filter. */
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user && !isInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kind = req.nextUrl.searchParams.get('kind') as TemplateKind | null;

  const db = createSupabaseServiceClient();
  let query = db
    .from('brand_templates')
    .select('*')
    .eq('brand_id', params.id)
    .order('kind')
    .order('name');

  if (kind && VALID_KINDS.includes(kind)) {
    query = query.eq('kind', kind) as typeof query;
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []) as BrandTemplate[]);
}

/** POST /api/brands/[id]/templates — create a new template. */
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    kind?: string;
    name?: string;
    content?: string;
    poster_type?: string;
    platform?: string;
  };

  if (!body.kind || !VALID_KINDS.includes(body.kind as TemplateKind)) {
    return NextResponse.json({ error: '`kind` must be "poster" or "caption"' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: '`name` is required' }, { status: 400 });
  }
  if (body.kind === 'poster' && body.poster_type && !VALID_POSTER_TYPES.includes(body.poster_type)) {
    return NextResponse.json({ error: `Invalid poster_type` }, { status: 400 });
  }
  if (body.kind === 'caption' && body.platform && !VALID_PLATFORMS.includes(body.platform)) {
    return NextResponse.json({ error: `Invalid platform` }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  // Verify brand exists
  const { data: brand } = await db.from('brands').select('id').eq('id', params.id).maybeSingle();
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

  const { data, error } = await db
    .from('brand_templates')
    .insert({
      id: randomUUID(),
      brand_id: params.id,
      kind: body.kind,
      name: body.name.trim(),
      content: body.content ?? '',
      poster_type: body.kind === 'poster' ? (body.poster_type ?? null) : null,
      platform: body.kind === 'caption' ? (body.platform ?? null) : null,
      is_active: false,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as BrandTemplate, { status: 201 });
}
