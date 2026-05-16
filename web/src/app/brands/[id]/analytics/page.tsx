import { redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { Brand } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function BrandAnalyticsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: brandData } = await db
    .from('brands')
    .select('id, name')
    .eq('id', params.id)
    .maybeSingle();

  if (!brandData) redirect('/brands');

  const brand = brandData as Pick<Brand, 'id' | 'name'>;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">{brand.name} · publishing performance and reach</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-10 text-center">
        <p className="text-slate-400 text-sm">Analytics coming soon.</p>
        <p className="text-slate-600 text-xs mt-1">
          Per-brand reach, engagement, and publishing performance will appear here.
        </p>
      </div>
    </div>
  );
}
