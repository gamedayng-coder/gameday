import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';

type Params = { params: { id: string; platform: string } };

/** DELETE /api/brands/[id]/credentials/[platform] — remove a credential. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_credentials')
    .delete()
    .eq('brand_id', params.id)
    .eq('platform', params.platform);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
