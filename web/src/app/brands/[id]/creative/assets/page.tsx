import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { CreativeAsset } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  draft:            'bg-slate-600 text-slate-200',
  ready_for_review: 'bg-yellow-900 text-yellow-300',
  approved:         'bg-green-900 text-green-300',
  rejected:         'bg-red-900 text-red-300',
  published:        'bg-emerald-900 text-emerald-300',
  archived:         'bg-slate-700 text-slate-500',
};

type Props = { params: { id: string } };

export default async function AssetsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('creative_assets')
    .select('*')
    .eq('brand_id', params.id)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  const assets = (data ?? []) as CreativeAsset[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Creative assets</h1>
          <p className="text-sm text-slate-500 mt-0.5">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href={`/brands/${params.id}/creative`}
          className="text-sm text-slate-400 hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          ← Campaigns
        </Link>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No assets yet.</p>
          <p className="mt-1 text-sm">Assets are created by generation jobs or uploaded externally.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {assets.map((a) => (
            <li key={a.id} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_STYLES[a.status] ?? 'bg-slate-600 text-slate-200'}`}>
                {a.status.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100 truncate">{a.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.asset_type}
                  {a.mime_type ? ` · ${a.mime_type}` : ''}
                  {a.generation_source ? ` · via ${a.generation_source}` : ''}
                  {' · '}Updated {new Date(a.updated_at).toLocaleDateString()}
                </p>
              </div>
              {(a.file_url || a.file_path) && (
                <a
                  href={a.file_url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:underline shrink-0"
                >
                  View file
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
