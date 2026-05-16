import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../../lib/supabase/service';
import type { DataSourceRun, DataSourceRunStatus } from '../../../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; sourceId: string; runId: string } };

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
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

interface RecordTypeSummary {
  external_record_type: string;
  count: number;
}

export default async function RunDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: sourceData }, { data: runData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('data_sources')
      .select('id, name, provider, source_type')
      .eq('id', params.sourceId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('data_source_runs')
      .select('*')
      .eq('id', params.runId)
      .eq('data_source_id', params.sourceId)
      .eq('brand_id', params.id)
      .maybeSingle(),
  ]);

  if (!brandData) redirect('/brands');
  if (!sourceData) redirect(`/brands/${params.id}/data-sources`);
  if (!runData) redirect(`/brands/${params.id}/data-sources/${params.sourceId}/runs`);

  const run = runData as DataSourceRun;

  // Count raw records for this run, grouped by type
  const { data: recordCountsData } = await db
    .from('data_source_records')
    .select('external_record_type')
    .eq('run_id', params.runId)
    .eq('brand_id', params.id);

  const rawRecords = recordCountsData ?? [];
  const totalRawRecords = rawRecords.length;
  const recordsByType = rawRecords.reduce<Record<string, number>>((acc, r) => {
    const t = (r as { external_record_type: string }).external_record_type;
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const recordTypeSummaries: RecordTypeSummary[] = Object.entries(recordsByType)
    .map(([external_record_type, count]) => ({ external_record_type, count }))
    .sort((a, b) => b.count - a.count);

  const metadataEntries = Object.entries(run.metadata ?? {});

  return (
    <div className="px-8 py-8 max-w-3xl">
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
        <Link href={`/brands/${params.id}/data-sources/${params.sourceId}/runs`} className="hover:text-slate-300">
          Run History
        </Link>
        <span>›</span>
        <span className="text-slate-400 font-mono">{run.id.slice(0, 8)}…</span>
      </nav>

      <div className="flex items-start gap-3 mb-6">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${RUN_STATUS_COLOURS[run.status]}`}>
          {run.status}
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-100 capitalize">{run.run_type} run</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sourceData.name} · {sourceData.provider}
          </p>
        </div>
      </div>

      {/* Failure message */}
      {run.error_message && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Error</p>
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap break-words">
            {run.error_message}
          </p>
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Throughput</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Records received</span>
              <span className="font-semibold text-slate-200">{run.records_received}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Records processed</span>
              <span className="font-semibold text-slate-200">{run.records_processed}</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Timing</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Started</span>
              <span className="text-slate-300 text-xs">
                {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Finished</span>
              <span className="text-slate-300 text-xs">
                {run.finished_at ? new Date(run.finished_at).toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Duration</span>
              <span className="text-slate-300 text-xs">
                {formatDuration(run.started_at, run.finished_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Raw records */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-5 mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Raw Records
        </h2>
        {totalRawRecords === 0 ? (
          <p className="text-sm text-slate-600">No raw records captured for this run.</p>
        ) : (
          <>
            <p className="text-sm text-slate-300 mb-3">
              <span className="font-semibold text-slate-100">{totalRawRecords}</span> raw record{totalRawRecords !== 1 ? 's' : ''} stored
            </p>
            {recordTypeSummaries.length > 0 && (
              <div className="space-y-1.5">
                {recordTypeSummaries.map(({ external_record_type, count }) => (
                  <div key={external_record_type} className="flex justify-between text-sm">
                    <span className="text-slate-400 font-mono text-xs">{external_record_type}</span>
                    <span className="text-slate-300 font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Metadata */}
      {metadataEntries.length > 0 && (
        <section className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-5 mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Metadata
          </h2>
          <div className="space-y-1.5">
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 text-sm">
                <span className="text-slate-400 font-mono text-xs shrink-0">{key}</span>
                <span className="text-slate-300 text-xs text-right break-all">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Run identifiers */}
      <section className="text-xs text-slate-700 space-y-0.5">
        <p>Run ID: <span className="font-mono">{run.id}</span></p>
        <p>Source ID: <span className="font-mono">{run.data_source_id}</span></p>
        <p>Created: {new Date(run.created_at).toLocaleString()}</p>
      </section>
    </div>
  );
}
