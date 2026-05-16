import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { CreativeGenerationJob } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-slate-600 text-slate-200',
  in_progress: 'bg-blue-900 text-blue-300',
  completed:   'bg-green-900 text-green-300',
  failed:      'bg-red-900 text-red-300',
  blocked:     'bg-yellow-900 text-yellow-300',
  cancelled:   'bg-slate-700 text-slate-500',
};

type Props = { params: { id: string } };

export default async function GenerationJobsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('creative_generation_jobs')
    .select('*')
    .eq('brand_id', params.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const jobs = (data ?? []) as CreativeGenerationJob[];

  const active  = jobs.filter((j) => ['pending', 'in_progress', 'blocked'].includes(j.status));
  const settled = jobs.filter((j) => ['completed', 'failed', 'cancelled'].includes(j.status));

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Generation jobs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {active.length} active · {settled.length} completed/failed
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/creative`}
          className="text-sm text-slate-400 hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          ← Campaigns
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No generation jobs yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active</h2>
              <ul className="space-y-2">
                {active.map((j) => <JobRow key={j.id} job={j} brandId={params.id} />)}
              </ul>
            </section>
          )}
          {settled.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">History</h2>
              <ul className="space-y-2">
                {settled.map((j) => <JobRow key={j.id} job={j} brandId={params.id} />)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function JobRow({ job, brandId }: { job: CreativeGenerationJob; brandId: string }) {
  const statusStyle = STATUS_STYLES[job.status] ?? 'bg-slate-600 text-slate-200';

  return (
    <li className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
      <div className="flex items-center gap-3 mb-2">
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusStyle}`}>
          {job.status.replace('_', ' ')}
        </span>
        <span className="text-sm font-semibold text-slate-200">{job.target_asset_type}</span>
        {job.tool_name && <span className="text-xs text-slate-500">via {job.tool_name}</span>}
      </div>
      {job.prompt_text && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-2">{job.prompt_text}</p>
      )}
      {job.error_message && (
        <p className="text-xs text-red-400 mb-2">{job.error_message}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-slate-600">
        <span>{new Date(job.created_at).toLocaleString()}</span>
        {job.output_asset_id && (
          <Link
            href={`/brands/${brandId}/creative/assets`}
            className="text-indigo-400 hover:underline"
          >
            View output asset
          </Link>
        )}
      </div>
    </li>
  );
}
