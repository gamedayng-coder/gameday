import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { DataSource, DataSourceRun, DataSourceStatus, DataSourceRunStatus } from '../../../../../db/schema';
import { updateDataSource, setDataSourceStatus, triggerManualSync } from '../../../../../lib/data-source-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; sourceId: string } };

const STATUS_COLOURS: Record<DataSourceStatus, string> = {
  draft:    'bg-slate-700 text-slate-400',
  active:   'bg-green-900/40 text-green-300',
  paused:   'bg-yellow-900/40 text-yellow-300',
  error:    'bg-red-900/40 text-red-400',
  archived: 'bg-slate-800 text-slate-600',
};

const RUN_STATUS_COLOURS: Record<DataSourceRunStatus, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300',
  running:   'bg-blue-900/40 text-blue-300',
  completed: 'bg-green-900/40 text-green-300',
  failed:    'bg-red-900/40 text-red-400',
  cancelled: 'bg-slate-700 text-slate-500',
};

const ALLOWED_TRANSITIONS: Record<DataSourceStatus, DataSourceStatus[]> = {
  draft:    ['active', 'archived'],
  active:   ['paused', 'archived'],
  paused:   ['active', 'archived'],
  error:    ['active', 'paused', 'archived'],
  archived: [],
};

export default async function DataSourceDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: sourceData }, { data: runsData }, { data: credentialsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('data_sources')
      .select('*')
      .eq('id', params.sourceId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('data_source_runs')
      .select('*')
      .eq('data_source_id', params.sourceId)
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('credentials').select('id, name, service').order('name'),
  ]);

  if (!brandData) redirect('/brands');
  if (!sourceData) redirect(`/brands/${params.id}/data-sources`);

  const source = sourceData as DataSource;
  const runs = (runsData ?? []) as DataSourceRun[];
  const credentials = (credentialsData ?? []) as { id: string; name: string; service: string }[];

  const updateAction = updateDataSource.bind(null, params.id, params.sourceId);
  const allowedNext = ALLOWED_TRANSITIONS[source.status as DataSourceStatus] ?? [];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/data-sources`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Data Sources
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[source.status as DataSourceStatus]}`}>
              {source.status}
            </span>
            {source.is_primary && (
              <span className="text-xs text-indigo-400">primary</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-100">{source.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{source.provider} · {source.source_type}</p>
        </div>

        {/* Status transition buttons */}
        {allowedNext.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {allowedNext.map((next) => {
              const action = setDataSourceStatus.bind(null, params.id, params.sourceId, next);
              return (
                <form key={next} action={action}>
                  <button
                    type="submit"
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      next === 'archived'
                        ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        : next === 'active'
                        ? 'bg-green-800 text-green-200 hover:bg-green-700'
                        : 'bg-yellow-900/60 text-yellow-300 hover:bg-yellow-900'
                    }`}
                  >
                    {next === 'active' ? 'Activate' : next === 'paused' ? 'Pause' : next === 'archived' ? 'Archive' : next}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit form */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-5 mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Configuration</h2>
        <form action={updateAction} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Name <span className="text-red-400">*</span></label>
            <input
              name="name"
              type="text"
              required
              defaultValue={source.name}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Provider</label>
              <p className="text-sm text-slate-300 px-3 py-2 bg-slate-700/50 rounded-lg">{source.provider}</p>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Source type</label>
              <p className="text-sm text-slate-300 px-3 py-2 bg-slate-700/50 rounded-lg">{source.source_type}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Source purpose</label>
            <input
              name="source_purpose"
              type="text"
              defaultValue={source.source_purpose ?? ''}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Base URL</label>
            <input
              name="base_url"
              type="url"
              defaultValue={source.base_url ?? ''}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Credential</label>
            <select
              name="credential_id"
              defaultValue={source.credential_id ?? ''}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— none —</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.service})
                </option>
              ))}
            </select>
          </div>
          <div className="pt-1">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      {/* Sync section */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent runs</h2>
            <Link
              href={`/brands/${params.id}/data-sources/${params.sourceId}/runs`}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          {source.status === 'active' && (
            <form action={triggerManualSync.bind(null, params.id, params.sourceId)}>
              <button
                type="submit"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Trigger sync
              </button>
            </form>
          )}
        </div>

        {source.last_synced_at && (
          <p className="text-xs text-slate-600 mb-3">
            Last synced {new Date(source.last_synced_at).toLocaleString()}
          </p>
        )}

        {runs.length === 0 ? (
          <p className="text-sm text-slate-600">No runs yet.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <Link
                key={r.id}
                href={`/brands/${params.id}/data-sources/${params.sourceId}/runs/${r.id}`}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0 hover:bg-slate-700/30 -mx-2 px-2 rounded transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RUN_STATUS_COLOURS[r.status as DataSourceRunStatus]}`}>
                    {r.status}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">{r.run_type}</span>
                  {r.error_message && (
                    <span className="text-xs text-red-400 truncate max-w-xs">{r.error_message}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div>
                    <p className="text-xs text-slate-600">{new Date(r.created_at).toLocaleString()}</p>
                    {(r.records_received > 0 || r.records_processed > 0) && (
                      <p className="text-xs text-slate-600 mt-0.5">
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

      {/* Metadata */}
      <section className="text-xs text-slate-700 space-y-0.5">
        <p>ID: <span className="font-mono">{source.id}</span></p>
        <p>Created: {new Date(source.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(source.updated_at).toLocaleString()}</p>
      </section>
    </div>
  );
}
