import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { AnalysisReport, AnalysisReportStatus } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const STATUS_COLOURS: Record<AnalysisReportStatus, string> = {
  pending:   'bg-slate-700 text-slate-400',
  running:   'bg-blue-900/40 text-blue-300',
  completed: 'bg-green-900/40 text-green-300',
  failed:    'bg-red-900/40 text-red-400',
};

export default async function ReportsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: reportsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('analysis_reports')
      .select('*')
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (!brandData) redirect('/brands');

  const reports = (reportsData ?? []) as AnalysisReport[];
  const completed = reports.filter((r) => r.status === 'completed');
  const other     = reports.filter((r) => r.status !== 'completed');

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">{brandData.name}</p>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-slate-500">No reports available.</p>
      ) : (
        <>
          {completed.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Completed</h2>
              <div className="space-y-2">
                {completed.map((r) => <ReportRow key={r.id} r={r} brandId={params.id} />)}
              </div>
            </div>
          )}
          {other.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">In progress / failed</h2>
              <div className="space-y-2">
                {other.map((r) => <ReportRow key={r.id} r={r} brandId={params.id} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportRow({ r, brandId }: { r: AnalysisReport; brandId: string }) {
  return (
    <Link
      href={`/brands/${brandId}/reports/${r.id}`}
      className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[r.status as AnalysisReportStatus]}`}>
              {r.status}
            </span>
            <span className="text-xs text-slate-500 capitalize">{r.report_type.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm font-medium text-slate-200">{r.title}</p>
          {r.summary_text && (
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{r.summary_text}</p>
          )}
          {(r.period_start || r.period_end) && (
            <p className="text-xs text-slate-600 mt-0.5">
              {r.period_start} {r.period_end ? `→ ${r.period_end}` : ''}
            </p>
          )}
        </div>
        <p className="text-xs text-slate-600 shrink-0">{new Date(r.created_at).toLocaleDateString()}</p>
      </div>
    </Link>
  );
}
