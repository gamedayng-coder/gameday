import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { AnalysisReport, AnalysisReportStatus } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; reportId: string } };

const STATUS_COLOURS: Record<AnalysisReportStatus, string> = {
  pending:   'bg-slate-700 text-slate-400',
  running:   'bg-blue-900/40 text-blue-300',
  completed: 'bg-green-900/40 text-green-300',
  failed:    'bg-red-900/40 text-red-400',
};

export default async function ReportDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: reportData } = await db
    .from('analysis_reports')
    .select('*')
    .eq('id', params.reportId)
    .eq('brand_id', params.id)
    .maybeSingle();

  if (!reportData) redirect(`/brands/${params.id}/reports`);

  const report = reportData as AnalysisReport;

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/reports`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Reports
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[report.status as AnalysisReportStatus]}`}>
          {report.status}
        </span>
        <span className="text-xs text-slate-500 capitalize">{report.report_type.replace(/_/g, ' ')}</span>
      </div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">{report.title}</h1>
      <div className="flex items-center gap-3 mb-6 text-xs text-slate-600">
        {report.period_start && (
          <span>Period: {report.period_start}{report.period_end ? ` → ${report.period_end}` : ''}</span>
        )}
        {report.generated_by_agent && <span>by {report.generated_by_agent}</span>}
        <span>{new Date(report.created_at).toLocaleString()}</span>
      </div>

      {/* In-progress or failed states */}
      {report.status === 'pending' || report.status === 'running' ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-slate-400">Report is being generated…</p>
        </div>
      ) : report.status === 'failed' ? (
        <div className="bg-slate-800 border border-red-800/40 rounded-xl px-5 py-4">
          <p className="text-sm text-red-400 font-medium mb-1">Report generation failed</p>
          {report.metadata && typeof (report.metadata as Record<string, unknown>).error === 'string' && (
            <p className="text-xs text-slate-500">{(report.metadata as Record<string, string>).error}</p>
          )}
        </div>
      ) : (
        <>
          {/* Summary text */}
          {report.summary_text && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 mb-4">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{report.summary_text}</p>
            </div>
          )}

          {/* Structured report_data */}
          {report.report_data && Object.keys(report.report_data).length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Data</h2>
              <div className="space-y-2">
                {Object.entries(report.report_data).map(([key, val]) => (
                  <div key={key} className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-700/50 last:border-0">
                    <span className="text-xs text-slate-500 capitalize shrink-0">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm text-slate-300 text-right font-mono">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!report.summary_text && (!report.report_data || Object.keys(report.report_data).length === 0) && (
            <p className="text-sm text-slate-500">No output available for this report.</p>
          )}
        </>
      )}
    </div>
  );
}
