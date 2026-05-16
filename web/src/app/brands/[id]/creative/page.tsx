import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { Campaign } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-slate-600 text-slate-200',
  active:    'bg-green-900 text-green-300',
  paused:    'bg-yellow-900 text-yellow-300',
  completed: 'bg-blue-900 text-blue-300',
  archived:  'bg-slate-700 text-slate-500',
};

type Props = { params: { id: string } };

export default async function CreativePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const [{ data: campaignsData }, { data: assetsCount }, { data: jobsCount }] = await Promise.all([
    db.from('campaigns').select('*').eq('brand_id', params.id).order('updated_at', { ascending: false }),
    db.from('creative_assets').select('id', { count: 'exact', head: true }).eq('brand_id', params.id),
    db.from('creative_generation_jobs').select('id', { count: 'exact', head: true }).eq('brand_id', params.id),
  ]);

  const campaigns = (campaignsData ?? []) as Campaign[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Creative</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            {' · '}
            <Link href={`/brands/${params.id}/creative/assets`} className="hover:text-slate-300 transition-colors">
              {(assetsCount as unknown as { count: number } | null)?.count ?? 0} assets
            </Link>
            {' · '}
            <Link href={`/brands/${params.id}/creative/jobs`} className="hover:text-slate-300 transition-colors">
              {(jobsCount as unknown as { count: number } | null)?.count ?? 0} jobs
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/brands/${params.id}/creative/assets`}
            className="text-sm text-slate-300 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Assets
          </Link>
          <Link
            href={`/brands/${params.id}/creative/jobs`}
            className="text-sm text-slate-300 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Jobs
          </Link>
          <Link
            href={`/brands/${params.id}/creative/campaigns/new`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + New campaign
          </Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No campaigns yet.</p>
          <p className="mt-1 text-sm">
            <Link href={`/brands/${params.id}/creative/campaigns/new`} className="text-indigo-400 hover:underline">
              Create your first campaign
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/brands/${params.id}/creative/campaigns/${c.id}`}
                className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 hover:border-slate-600 transition-colors"
              >
                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_STYLES[c.status] ?? 'bg-slate-600 text-slate-200'}`}>
                  {c.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.objective ? c.objective : 'No objective set'}
                    {c.start_date ? ` · ${c.start_date}` : ''}
                    {c.end_date ? ` → ${c.end_date}` : ''}
                  </p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
