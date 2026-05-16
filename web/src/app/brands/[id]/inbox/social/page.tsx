import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { SocialInteraction } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const STATUS_BADGE: Record<string, string> = {
  new:       'bg-blue-900 text-blue-300',
  triaged:   'bg-indigo-900 text-indigo-300',
  responded: 'bg-green-900 text-green-300',
  escalated: 'bg-red-900 text-red-300',
  closed:    'bg-slate-700 text-slate-500',
};

export default async function SocialInteractionsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: interactionsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('social_interactions')
      .select('*')
      .eq('brand_id', params.id)
      .in('status', ['new', 'triaged', 'escalated'])
      .order('created_at', { ascending: false }),
  ]);

  if (!brandData) redirect('/brands');

  const interactions = (interactionsData ?? []) as SocialInteraction[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Social Interactions</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {brandData.name} · comments, mentions, and DMs needing attention
        </p>
      </div>

      {interactions.length === 0 ? (
        <p className="text-sm text-slate-500">No interactions need attention.</p>
      ) : (
        <div className="space-y-2">
          {interactions.map((i) => (
            <Link
              key={i.id}
              href={`/brands/${params.id}/inbox/social/${i.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[i.status] ?? 'bg-slate-700 text-slate-400'}`}>
                      {i.status}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{i.interaction_type}</span>
                    <span className="text-xs text-slate-500 capitalize">{i.platform}</span>
                    {i.linked_thread_id && (
                      <span className="text-xs text-indigo-400">linked to thread</span>
                    )}
                  </div>
                  {i.author_handle && (
                    <p className="text-xs text-slate-500 mb-0.5">@{i.author_handle}</p>
                  )}
                  {i.interaction_text && (
                    <p className="text-sm text-slate-300 truncate">{i.interaction_text}</p>
                  )}
                </div>
                <span className="text-xs text-slate-600 shrink-0">
                  {new Date(i.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
