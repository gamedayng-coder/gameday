import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { BrandKnowledgeSummary } from '../../../../../db/schema';
import { deleteSummary } from '../../../../../lib/brand-knowledge-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function KnowledgeSummariesPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: summariesData }] = await Promise.all([
    db.from('brands').select('id').eq('id', params.id).maybeSingle(),
    db.from('brand_knowledge_summaries')
      .select('*')
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!brandData) notFound();

  const summaries = (summariesData ?? []) as BrandKnowledgeSummary[];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Knowledge summaries</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compiled summaries of brand knowledge items.
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/knowledge/summaries/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Add summary
        </Link>
      </div>

      {summaries.length === 0 ? (
        <p className="text-sm text-slate-500">No summaries yet.</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => {
            const deleteAction = deleteSummary.bind(null, params.id, summary.id);
            return (
              <div key={summary.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{summary.title}</p>
                    {summary.generated_at && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Generated {new Date(summary.generated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <form action={deleteAction} className="shrink-0">
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </div>
                <p className="text-xs text-slate-400 whitespace-pre-wrap line-clamp-4">{summary.body}</p>
                {summary.source_item_ids.length > 0 && (
                  <p className="text-xs text-slate-600 mt-2">
                    Sources: {summary.source_item_ids.length} item{summary.source_item_ids.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
