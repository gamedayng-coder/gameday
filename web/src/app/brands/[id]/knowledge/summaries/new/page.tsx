import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import { BrandKnowledgeItem } from '../../../../../../db/schema';
import { createSummary } from '../../../../../../lib/brand-knowledge-actions';

type Props = { params: { id: string } };

export default async function NewSummaryPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: itemsData } = await db
    .from('brand_knowledge_items')
    .select('id, title, category')
    .eq('brand_id', params.id)
    .order('title');

  const items = (itemsData ?? []) as Pick<BrandKnowledgeItem, 'id' | 'title' | 'category'>[];
  const createAction = createSummary.bind(null, params.id);

  const inputClass =
    'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500';

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/brands/${params.id}/knowledge/summaries`}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Summaries
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-bold">Add summary</h1>
        <p className="text-xs text-slate-500 mt-0.5">Compile a summary from knowledge items.</p>
      </div>

      <form action={createAction} className="space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Brand identity overview"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="body">Summary</label>
          <textarea
            id="body"
            name="body"
            rows={10}
            required
            placeholder="Write or paste the summary…"
            className={`${inputClass} resize-y`}
          />
        </div>

        {items.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="source_item_ids">
              Source items <span className="text-slate-600">comma-separated IDs (optional)</span>
            </label>
            <div className="mb-2 space-y-1 max-h-40 overflow-y-auto border border-slate-700 rounded-lg p-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-slate-400">
                  <code className="text-slate-600 select-all">{item.id}</code>
                  <span>—</span>
                  <span>{item.title}</span>
                  <span className="text-slate-600">({item.category})</span>
                </div>
              ))}
            </div>
            <input
              id="source_item_ids"
              name="source_item_ids"
              type="text"
              placeholder="id1, id2, id3"
              className={inputClass}
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Save summary
          </button>
        </div>
      </form>
    </div>
  );
}
