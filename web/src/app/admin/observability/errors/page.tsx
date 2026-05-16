import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { SystemErrorLog } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

const SEVERITY_COLORS: Record<string, string> = {
  error: 'bg-red-900/50 text-red-300 border border-red-800',
  warn:  'bg-amber-900/50 text-amber-300 border border-amber-800',
  info:  'bg-slate-700 text-slate-300',
};

const PAGE_SIZE = 50;

type Props = { searchParams: { service?: string; severity?: string; page?: string } };

export default async function ErrorLogsPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  let query = db
    .from('system_error_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (searchParams.service) query = query.eq('service', searchParams.service);
  if (searchParams.severity) query = query.eq('severity', searchParams.severity);

  const { data, count } = await query;

  const logs = (data ?? []) as SystemErrorLog[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Distinct services for the filter dropdown
  const { data: servicesData } = await db
    .from('system_error_logs')
    .select('service')
    .order('service');
  const services = Array.from(new Set((servicesData ?? []).map((r: { service: string }) => r.service)));

  const filterBase = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (searchParams.service) p.set('service', searchParams.service);
    if (searchParams.severity) p.set('severity', searchParams.severity);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/observability/errors?${p.toString()}`;
  };

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Error Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {count ?? 0} record{(count ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Service</label>
          <div className="flex gap-1">
            <Link
              href={filterBase({ service: '', page: '1' })}
              className={`text-xs px-2 py-1 rounded ${!searchParams.service ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              All
            </Link>
            {services.map((s) => (
              <Link
                key={s}
                href={filterBase({ service: s, page: '1' })}
                className={`text-xs px-2 py-1 rounded ${searchParams.service === s ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <label className="text-xs text-slate-500">Severity</label>
          <div className="flex gap-1">
            {['', 'error', 'warn', 'info'].map((sev) => (
              <Link
                key={sev || 'all'}
                href={filterBase({ severity: sev, page: '1' })}
                className={`text-xs px-2 py-1 rounded ${(searchParams.severity ?? '') === sev ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                {sev || 'All'}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">No error logs found.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Link
              key={log.id}
              href={`/admin/observability/errors/${log.id}`}
              className="block bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 hover:border-slate-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${SEVERITY_COLORS[log.severity] ?? SEVERITY_COLORS.info}`}>
                      {log.severity}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{log.service}</span>
                    <span className="text-xs text-slate-600 font-mono">[{log.context_tag}]</span>
                    {log.brand_id && (
                      <span className="text-xs text-slate-600">brand: {log.brand_id.slice(0, 8)}…</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 truncate">{log.message}</p>
                </div>
                <time className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={filterBase({ page: String(page - 1) })}
              className="text-sm text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500"
            >
              ← Previous
            </Link>
          )}
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link
              href={filterBase({ page: String(page + 1) })}
              className="text-sm text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
