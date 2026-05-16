import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { ContentItem } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  draft:      'bg-slate-600 text-slate-200',
  in_review:  'bg-yellow-900 text-yellow-300',
  approved:   'bg-green-900 text-green-300',
  rejected:   'bg-red-900 text-red-300',
  scheduled:  'bg-blue-900 text-blue-300',
  published:  'bg-emerald-900 text-emerald-300',
  archived:   'bg-slate-700 text-slate-500',
};

type Props = { params: { id: string } };

export default async function ContentListPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('content_items')
    .select('*')
    .eq('brand_id', params.id)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  const items = (data ?? []) as ContentItem[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Content</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/content/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + New content
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No content yet.</p>
          <p className="mt-1 text-sm">
            <Link href={`/brands/${params.id}/content/new`} className="text-indigo-400 hover:underline">
              Create your first content item
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/brands/${params.id}/content/${item.id}`}
                className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 hover:border-slate-600 transition-colors"
              >
                <span
                  className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_STYLES[item.status] ?? 'bg-slate-600 text-slate-200'}`}
                >
                  {item.status.replace('_', ' ')}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100 truncate">
                    {item.title ?? <span className="text-slate-500 italic">Untitled</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.content_type}
                    {item.platform ? ` · ${item.platform}` : ''}
                    {item.campaign_name ? ` · ${item.campaign_name}` : ''}
                    {' · '}Updated {new Date(item.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <span className="text-xs text-slate-500 shrink-0">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
