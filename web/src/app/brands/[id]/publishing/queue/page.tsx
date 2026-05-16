import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { PostV2 } from '../../../../../db/schema';
import { cancelPost, retryPost } from '../../../../../lib/post-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const STATUS_BADGE: Record<string, string> = {
  queued:     'bg-blue-900 text-blue-300',
  scheduled:  'bg-indigo-900 text-indigo-300',
  publishing: 'bg-yellow-900 text-yellow-300',
  failed:     'bg-red-900 text-red-300',
  published:  'bg-green-900 text-green-300',
  cancelled:  'bg-slate-700 text-slate-400',
  draft:      'bg-slate-800 text-slate-500',
};

const QUEUE_STATUSES = ['queued', 'scheduled', 'publishing', 'failed'];

export default async function PublishingQueuePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: posts }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('posts')
      .select('*')
      .eq('brand_id', params.id)
      .in('status', QUEUE_STATUSES)
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
  ]);

  if (!brandData) redirect('/brands');

  const items = (posts ?? []) as PostV2[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Publishing Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brandData.name} · queued, scheduled, in-progress, and failed posts
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/publishing/queue/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          New post
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No items in queue.</p>
      ) : (
        <div className="space-y-2">
          {items.map((post) => (
            <div
              key={post.id}
              className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-400 capitalize">{post.platform}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[post.status] ?? 'bg-slate-700 text-slate-400'}`}>
                    {post.status}
                  </span>
                  {post.approval_status !== 'approved' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 font-medium">
                      approval: {post.approval_status}
                    </span>
                  )}
                </div>
                {post.scheduled_for && (
                  <p className="text-xs text-slate-500">
                    Scheduled {new Date(post.scheduled_for).toLocaleString()}
                  </p>
                )}
                {post.error_message && (
                  <p className="text-xs text-red-400 mt-1 truncate">{post.error_message}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {post.status === 'failed' && (
                  <form action={retryPost.bind(null, params.id, post.id)}>
                    <button className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                      Retry
                    </button>
                  </form>
                )}
                {['draft', 'queued', 'scheduled', 'failed'].includes(post.status) && (
                  <form action={cancelPost.bind(null, params.id, post.id)}>
                    <button className="text-xs text-red-500 hover:text-red-400">Cancel</button>
                  </form>
                )}
                <Link
                  href={`/brands/${params.id}/publishing/queue/${post.id}`}
                  className="text-xs text-slate-400 hover:text-slate-100"
                >
                  Detail →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
