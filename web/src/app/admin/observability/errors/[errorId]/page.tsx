import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { SystemErrorLog } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

const SEVERITY_COLORS: Record<string, string> = {
  error: 'bg-red-900/50 text-red-300 border border-red-800',
  warn:  'bg-amber-900/50 text-amber-300 border border-amber-800',
  info:  'bg-slate-700 text-slate-300',
};

type Props = { params: { errorId: string } };

export default async function ErrorDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data } = await db
    .from('system_error_logs')
    .select('*')
    .eq('id', params.errorId)
    .maybeSingle();

  if (!data) notFound();

  const log = data as SystemErrorLog;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/observability/errors"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Error Logs
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${SEVERITY_COLORS[log.severity] ?? SEVERITY_COLORS.info}`}>
          {log.severity}
        </span>
        <span className="text-sm font-mono text-slate-400">{log.service}</span>
        <span className="text-sm font-mono text-slate-600">[{log.context_tag}]</span>
        <time className="text-xs text-slate-500 ml-auto">
          {new Date(log.created_at).toLocaleString()}
        </time>
      </div>

      <div className="space-y-4">
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message</h2>
          <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">{log.message}</p>
        </section>

        {log.stack_trace && (
          <section className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stack Trace</h2>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed">
              {log.stack_trace}
            </pre>
          </section>
        )}

        <section className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Context</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-500 text-xs">Service</dt>
              <dd className="text-slate-200 font-mono">{log.service}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs">Context Tag</dt>
              <dd className="text-slate-200 font-mono">{log.context_tag}</dd>
            </div>
            {log.brand_id && (
              <div>
                <dt className="text-slate-500 text-xs">Brand ID</dt>
                <dd className="text-slate-200 font-mono text-xs">{log.brand_id}</dd>
              </div>
            )}
            {log.entity_type && (
              <div>
                <dt className="text-slate-500 text-xs">Entity</dt>
                <dd className="text-slate-200 font-mono">{log.entity_type}</dd>
              </div>
            )}
            {log.entity_id && (
              <div>
                <dt className="text-slate-500 text-xs">Entity ID</dt>
                <dd className="text-slate-200 font-mono text-xs">{log.entity_id}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500 text-xs">Log ID</dt>
              <dd className="text-slate-200 font-mono text-xs">{log.id}</dd>
            </div>
          </dl>
        </section>

        {Object.keys(log.metadata).length > 0 && (
          <section className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Metadata</h2>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
