import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { DataSourceRun, DataSourceRunStatus } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const RUN_STATUS_COLOURS: Record<DataSourceRunStatus, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300',
  running:   'bg-blue-900/40 text-blue-300',
  completed: 'bg-green-900/40 text-green-300',
  failed:    'bg-red-900/40 text-red-400',
  cancelled: 'bg-slate-700 text-slate-500',
};

const CONSECUTIVE_FAILURE_ALERT = 3;
const FAILURE_RATE_WARN_PCT = 50;

interface SourceHealth {
  sourceId: string;
  sourceName: string;
  lastRunStatus: DataSourceRunStatus | null;
  lastSyncAt: string | null;
  failureRatePct: number;
  consecutiveFailures: number;
  totalRuns: number;
  alertLevel: 'ok' | 'warn' | 'critical';
}

function computeSourceHealth(
  sourceId: string,
  sourceName: string,
  lastSyncAt: string | null,
  runs: DataSourceRun[],
): SourceHealth {
  const sourceRuns = runs
    .filter((r) => r.data_source_id === sourceId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const last10 = sourceRuns.slice(0, 10);
  const terminalRuns = last10.filter((r) => r.status === 'completed' || r.status === 'failed');
  const failedCount = terminalRuns.filter((r) => r.status === 'failed').length;
  const failureRatePct =
    terminalRuns.length > 0 ? Math.round((failedCount / terminalRuns.length) * 100) : 0;

  let consecutiveFailures = 0;
  for (const r of sourceRuns) {
    if (r.status === 'failed') {
      consecutiveFailures++;
    } else if (r.status === 'completed') {
      break;
    }
    // skip pending / running / cancelled
  }

  const lastRunStatus = (sourceRuns[0]?.status ?? null) as DataSourceRunStatus | null;

  let alertLevel: 'ok' | 'warn' | 'critical' = 'ok';
  if (consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT) {
    alertLevel = 'critical';
  } else if (consecutiveFailures >= 2 || failureRatePct >= FAILURE_RATE_WARN_PCT) {
    alertLevel = 'warn';
  }

  return {
    sourceId,
    sourceName,
    lastRunStatus,
    lastSyncAt,
    failureRatePct,
    consecutiveFailures,
    totalRuns: sourceRuns.length,
    alertLevel,
  };
}

const ALERT_STYLES = {
  ok:       { row: '', badge: 'bg-green-900/40 text-green-300',  label: 'healthy' },
  warn:     { row: 'border-l-2 border-yellow-500', badge: 'bg-yellow-900/40 text-yellow-300', label: 'warn' },
  critical: { row: 'border-l-2 border-red-500',    badge: 'bg-red-900/40 text-red-400',       label: 'critical' },
};

export default async function DataSourceRunsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: sourcesData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db
      .from('data_sources')
      .select('id, name, status, last_synced_at')
      .eq('brand_id', params.id)
      .in('status', ['active', 'error', 'paused'])
      .order('name', { ascending: true }),
  ]);

  if (!brandData) redirect('/brands');

  const sources = (sourcesData ?? []) as {
    id: string;
    name: string;
    status: string;
    last_synced_at: string | null;
  }[];

  const sourceIds = sources.map((s) => s.id);

  const { data: runsData } = sourceIds.length > 0
    ? await db
        .from('data_source_runs')
        .select('*')
        .eq('brand_id', params.id)
        .in('data_source_id', sourceIds)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [] };

  const runs = (runsData ?? []) as DataSourceRun[];

  const healthBySources: SourceHealth[] = sources.map((s) =>
    computeSourceHealth(s.id, s.name, s.last_synced_at, runs),
  );

  const criticalCount = healthBySources.filter((h) => h.alertLevel === 'critical').length;
  const warnCount = healthBySources.filter((h) => h.alertLevel === 'warn').length;
  const okCount = healthBySources.filter((h) => h.alertLevel === 'ok').length;

  const recentRuns = runs.slice(0, 50);
  const sourceNameById = Object.fromEntries(sources.map((s) => [s.id, s.name]));

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link
        href={`/brands/${params.id}/data-sources`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Data Sources
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Integration Run Monitoring</h1>
        <p className="text-sm text-slate-500 mt-0.5">{brandData.name}</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Healthy</p>
          <p className="text-2xl font-bold text-green-300">{okCount}</p>
        </div>
        <div className={`bg-slate-800 border rounded-xl px-5 py-4 ${warnCount > 0 ? 'border-yellow-600/50' : 'border-slate-700'}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Warning</p>
          <p className={`text-2xl font-bold ${warnCount > 0 ? 'text-yellow-300' : 'text-slate-600'}`}>{warnCount}</p>
        </div>
        <div className={`bg-slate-800 border rounded-xl px-5 py-4 ${criticalCount > 0 ? 'border-red-600/50' : 'border-slate-700'}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Critical</p>
          <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>{criticalCount}</p>
        </div>
      </div>

      {/* Per-source health table */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Source Health</h2>

        {healthBySources.length === 0 ? (
          <p className="text-sm text-slate-600">No active, paused, or error data sources found.</p>
        ) : (
          <div className="space-y-2">
            {healthBySources
              .sort((a, b) => {
                const order = { critical: 0, warn: 1, ok: 2 };
                return order[a.alertLevel] - order[b.alertLevel];
              })
              .map((h) => {
                const { row, badge, label } = ALERT_STYLES[h.alertLevel];
                return (
                  <Link
                    key={h.sourceId}
                    href={`/brands/${params.id}/data-sources/${h.sourceId}/runs`}
                    className={`block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors ${row}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                          {label}
                        </span>
                        <span className="text-sm font-medium text-slate-200">{h.sourceName}</span>
                      </div>
                      <div className="flex items-center gap-6 text-right shrink-0 ml-4">
                        <div>
                          <p className="text-xs text-slate-500">Last run</p>
                          {h.lastRunStatus ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RUN_STATUS_COLOURS[h.lastRunStatus]}`}>
                              {h.lastRunStatus}
                            </span>
                          ) : (
                            <p className="text-xs text-slate-700">never</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Failure rate</p>
                          <p className={`text-xs font-semibold ${h.failureRatePct >= FAILURE_RATE_WARN_PCT ? 'text-red-400' : 'text-slate-300'}`}>
                            {h.totalRuns === 0 ? '—' : `${h.failureRatePct}%`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Consec. failures</p>
                          <p className={`text-xs font-semibold ${h.consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT ? 'text-red-400' : h.consecutiveFailures >= 2 ? 'text-yellow-300' : 'text-slate-300'}`}>
                            {h.consecutiveFailures}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Last synced</p>
                          <p className="text-xs text-slate-400">
                            {h.lastSyncAt ? new Date(h.lastSyncAt).toLocaleString() : 'never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
      </section>

      {/* Recent runs feed */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Recent Runs{recentRuns.length > 0 ? ` (last ${recentRuns.length})` : ''}
        </h2>

        {recentRuns.length === 0 ? (
          <p className="text-sm text-slate-600">No runs recorded yet.</p>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
            {recentRuns.map((r) => (
              <Link
                key={r.id}
                href={`/brands/${params.id}/data-sources/${r.data_source_id}/runs/${r.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-750 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${RUN_STATUS_COLOURS[r.status as DataSourceRunStatus]}`}>
                    {r.status}
                  </span>
                  <span className="text-sm text-slate-300 truncate">
                    {sourceNameById[r.data_source_id] ?? r.data_source_id}
                  </span>
                  <span className="text-xs text-slate-600 capitalize shrink-0">{r.run_type}</span>
                  {r.error_message && (
                    <span className="text-xs text-red-400 truncate max-w-xs" title={r.error_message}>
                      {r.error_message}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right shrink-0 ml-4">
                  <div>
                    <p className="text-xs text-slate-600">{new Date(r.created_at).toLocaleString()}</p>
                    {(r.records_received > 0 || r.records_processed > 0) && (
                      <p className="text-xs text-slate-700 mt-0.5">
                        {r.records_received} recv · {r.records_processed} proc
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Alert threshold legend */}
      <section className="mt-8 text-xs text-slate-700 space-y-0.5">
        <p>Thresholds — warn: ≥2 consecutive failures or &gt;{FAILURE_RATE_WARN_PCT}% failure rate (last 10 runs).</p>
        <p>Critical: ≥{CONSECUTIVE_FAILURE_ALERT} consecutive failures.</p>
      </section>
    </div>
  );
}
