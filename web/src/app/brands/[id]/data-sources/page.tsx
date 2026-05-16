import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { DataSource, DataSourceStatus } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string }; searchParams: { status?: string } };

const STATUS_COLOURS: Record<DataSourceStatus, string> = {
  draft:    'bg-slate-700 text-slate-400',
  active:   'bg-green-900/40 text-green-300',
  paused:   'bg-yellow-900/40 text-yellow-300',
  error:    'bg-red-900/40 text-red-400',
  archived: 'bg-slate-800 text-slate-600',
};

const STATUS_TABS: DataSourceStatus[] = ['active', 'draft', 'paused', 'error', 'archived'];

export default async function DataSourcesPage({ params, searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const statusFilter = (searchParams.status as DataSourceStatus | undefined) ?? 'active';

  const [{ data: brandData }, { data: sourcesData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('data_sources')
      .select('*')
      .eq('brand_id', params.id)
      .eq('status', statusFilter)
      .order('name', { ascending: true }),
  ]);

  if (!brandData) redirect('/brands');

  const sources = (sourcesData ?? []) as DataSource[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Data Sources</h1>
          <p className="text-sm text-slate-500 mt-0.5">{brandData.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/brands/${params.id}/data-sources/runs`}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Runs
          </Link>
          <Link
            href={`/brands/${params.id}/data-sources/new`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            New source
          </Link>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-700 pb-2">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/brands/${params.id}/data-sources?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${
              statusFilter === s
                ? 'bg-slate-700 text-slate-100 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-slate-500">No sources with status &quot;{statusFilter}&quot;.</p>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <Link
              key={s.id}
              href={`/brands/${params.id}/data-sources/${s.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[s.status as DataSourceStatus]}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-slate-500">{s.provider}</span>
                    {s.source_purpose && (
                      <span className="text-xs text-slate-600">{s.source_purpose}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-200">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.source_type}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {s.last_synced_at ? (
                    <p className="text-xs text-slate-600">
                      synced {new Date(s.last_synced_at).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-700">never synced</p>
                  )}
                  {s.is_primary && (
                    <p className="text-xs text-indigo-400 mt-0.5">primary</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
