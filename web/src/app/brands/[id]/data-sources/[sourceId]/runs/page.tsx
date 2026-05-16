import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { DataSourceRun, DataSourceRunStatus } from '../../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; sourceId: string } };

const RUN_STATUS_COLOURS: Record<DataSourceRunStatus, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300',
  running:   'bg-blue-900/40 text-blue-300',
  completed: 'bg-green-900/40 text-green-300',
  failed:    'bg-red-900/40 text-red-400',
  cancelled: 'bg-slate-700 text-slate-500',
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export default async function SourceRunsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: sourceData }, { data: runsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('data_sources')
      .select('id, name, status, provider, source_type, last_synced_at')
      .eq('id', params.sourceId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('data_source_runs')
      .select('*')
      .eq('data_source_id', params.sourceId)
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (!brandData) redirect('/brands');
  if (!sourceData) redirect(`/brands/${params.id}/data-sources`);

  const runs = (runsData ?? []) as DataSourceRun[];

  const totalRuns = runs.length;
  const terminalRuns = runs.filter((r) => r.status === 'completed' || r.status === 'failed');
  const failedCount = terminalRuns.filter((r) => r.status === 'failed').length;
  const failureRatePct = terminalRuns.length > 0
    ? Math.round((failedCount / terminalRuns.length) * 100)
    : 0;

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
        <Link href={`/brands/${params.id}/data-sources`} className="hover:text-slate-300">
          Data Sources
        </Link>
        <span>›</span>
        <Link href={`/brands/${params.id}/data-sources/${params.sourceId}`} className="hover:text-slate-300">
          {sourceData.name}
        </Link>
        <span>›</span>
        <span className="text-slate-400">Run History</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Run History</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sourceData.name} · {sourceData.provider} · {sourceData.source_type}
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/data-sources/runs`}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← All sources
        </Link>
      </div>

      {/* Source summary */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total runs</p>
          <p className="text-xl font-bold text-slate-100">{totalRuns}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Failure rate</p>
          <p className={`text-xl font-bold ${failureRatePct >= 50 ? 'text-red-400' : failureRatePct > 0 ? 'text-yellow-300' : 'text-slate-100'}`}>
            {totalRuns === 0 ? '—' : `${failureRatePct}%`}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last synced</p>
          <p className="text-xs font-medium text-slate-300 mt-1">
            {sourceData.last_synced_at
              ? new Date(sourceData.last_synced_at).toLocaleString()
              : 'never'}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
          <p className="text-xs font-medium text-slate-300 mt-1 capitalize">{sourceData.status}</p>
        </div>
      </div>

      {/* Run list */}
      {runs.length === 0 ? (
        <p className="text-sm text-slate-600">No runs recorded for this source yet.</p>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
          {runs.map((r) => (
            <Link
              key={r.id}
              href={`/brands/${params.id}/data-sources/${params.sourceId}/runs/${r.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-750 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${RUN_STATUS_COLOURS[r.status]}`}>
                  {r.status}
                </span>
                <span className="text-xs text-slate-500 capitalize shrink-0">{r.run_type}</span>
                {r.error_message && (
                  <span
                    className="text-xs text-red-400 truncate max-w-xs"
                    title={r.error_message}
                  >
                    {r.error_message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6 text-right shrink-0 ml-4">
                {(r.records_received > 0 || r.records_processed > 0) && (
                  <div>
                    <p className="text-xs text-slate-600">recv / proc</p>
                    <p className="text-xs text-slate-400">
                      {r.records_received} / {r.records_processed}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-600">duration</p>
                  <p className="text-xs text-slate-400">
                    {formatDuration(r.started_at, r.finished_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">started</p>
                  <p className="text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {runs.length >= 100 && (
        <p className="text-xs text-slate-700 mt-3">Showing most recent 100 runs.</p>
      )}
    </div>
  );
}
