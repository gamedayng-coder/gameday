import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { ContentItem } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function ReviewQueuePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('content_items')
    .select('*')
    .eq('brand_id', params.id)
    .in('status', ['in_review', 'draft'])
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  const items = (data ?? []) as ContentItem[];
  const inReview = items.filter((i) => i.status === 'in_review');
  const drafts   = items.filter((i) => i.status === 'draft');

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Review queue</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {inReview.length} in review · {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {inReview.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-3">In review</h2>
          <ul className="space-y-2">
            {inReview.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/brands/${params.id}/content/${item.id}`}
                  className="flex items-center gap-4 bg-slate-800 border border-yellow-900/40 rounded-xl px-5 py-4 hover:border-yellow-900/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate">
                      {item.title ?? <span className="text-slate-500 italic">Untitled</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.content_type}
                      {item.platform ? ` · ${item.platform}` : ''}
                      {' · '}Updated {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-yellow-400 shrink-0">Review →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {drafts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Drafts</h2>
          <ul className="space-y-2">
            {drafts.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/brands/${params.id}/content/${item.id}`}
                  className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate">
                      {item.title ?? <span className="text-slate-500 italic">Untitled</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.content_type}
                      {item.platform ? ` · ${item.platform}` : ''}
                      {' · '}Updated {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No items pending review.</p>
          <p className="mt-1 text-sm">
            <Link href={`/brands/${params.id}/content`} className="text-indigo-400 hover:underline">
              Go to content list
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
