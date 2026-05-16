import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { BrandKnowledgeItem } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function KnowledgeItemsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: itemsData }] = await Promise.all([
    db.from('brands').select('id').eq('id', params.id).maybeSingle(),
    db.from('brand_knowledge_items')
      .select('*')
      .eq('brand_id', params.id)
      .order('category')
      .order('title'),
  ]);

  if (!brandData) notFound();

  const items = (itemsData ?? []) as BrandKnowledgeItem[];

  // Group by category
  const grouped = items.reduce<Record<string, BrandKnowledgeItem[]>>((acc, item) => {
    const key = item.category || 'general';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Knowledge items</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Free-form knowledge entries used as context by agents and humans.
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/knowledge/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Add item
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No knowledge items yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {category}
              </h2>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/brands/${params.id}/knowledge/${item.id}`}
                    className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 mb-1">{item.title}</p>
                        <p className="text-xs text-slate-400 line-clamp-2">{item.body}</p>
                      </div>
                      <div className="shrink-0 flex flex-wrap gap-1 justify-end">
                        {item.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {item.source && (
                      <p className="text-xs text-slate-600 mt-2">Source: {item.source}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
