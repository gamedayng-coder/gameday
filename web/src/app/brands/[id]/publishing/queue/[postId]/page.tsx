import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { PostV2, PublishAttempt } from '../../../../../../db/schema';
import { cancelPost, retryPost } from '../../../../../../lib/post-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; postId: string } };

const STATUS_BADGE: Record<string, string> = {
  queued:     'bg-blue-900 text-blue-300',
  scheduled:  'bg-indigo-900 text-indigo-300',
  publishing: 'bg-yellow-900 text-yellow-300',
  failed:     'bg-red-900 text-red-300',
  published:  'bg-green-900 text-green-300',
  cancelled:  'bg-slate-700 text-slate-400',
  draft:      'bg-slate-800 text-slate-500',
};

const ATTEMPT_BADGE: Record<string, string> = {
  succeeded:   'bg-green-900 text-green-300',
  failed:      'bg-red-900 text-red-300',
  in_progress: 'bg-yellow-900 text-yellow-300',
  pending:     'bg-slate-700 text-slate-400',
  blocked:     'bg-amber-900 text-amber-300',
  cancelled:   'bg-slate-700 text-slate-400',
};

export default async function PostDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: postData }, { data: attemptsData }, { data: brandData }] = await Promise.all([
    db.from('posts').select('*').eq('id', params.postId).eq('brand_id', params.id).maybeSingle(),
    db.from('publish_attempts')
      .select('*')
      .eq('post_id', params.postId)
      .order('attempt_number', { ascending: false }),
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
  ]);

  if (!postData || !brandData) redirect(`/brands/${params.id}/publishing/queue`);

  const post = postData as PostV2;
  const attempts = (attemptsData ?? []) as PublishAttempt[];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/brands/${params.id}/publishing/queue`}
          className="text-xs text-slate-500 hover:text-slate-300 mb-2 inline-block"
        >
          ← Queue
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100 capitalize">{post.platform} post</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[post.status] ?? 'bg-slate-700 text-slate-400'}`}>
            {post.status}
          </span>
          {post.approval_status !== 'approved' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 font-medium">
              approval: {post.approval_status}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">{brandData.name}</p>
      </div>

      {/* Post metadata */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 space-y-3 mb-6">
        <Row label="Platform" value={post.platform} />
        {post.scheduled_for && (
          <Row label="Scheduled for" value={new Date(post.scheduled_for).toLocaleString()} />
        )}
        {post.published_at && (
          <Row label="Published at" value={new Date(post.published_at).toLocaleString()} />
        )}
        {post.external_post_id && (
          <Row label="External ID" value={post.external_post_id} />
        )}
        {post.published_by_agent && (
          <Row label="Published by" value={post.published_by_agent} />
        )}
        {post.content_item_id && (
          <Row
            label="Content item"
            value={
              <Link
                href={`/brands/${params.id}/content/${post.content_item_id}`}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                {post.content_item_id}
              </Link>
            }
          />
        )}
        {post.error_message && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Error</p>
            <p className="text-sm text-red-400">{post.error_message}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        {post.status === 'failed' && (
          <form action={retryPost.bind(null, params.id, post.id)}>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Retry
            </button>
          </form>
        )}
        {['draft', 'queued', 'scheduled', 'failed'].includes(post.status) && (
          <form action={cancelPost.bind(null, params.id, post.id)}>
            <button className="border border-red-700 text-red-400 hover:bg-red-900/30 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Attempt history — read-only */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Publish attempt history</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">No attempts recorded.</p>
        ) : (
          <div className="space-y-2">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-sm"
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs text-slate-500">#{attempt.attempt_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ATTEMPT_BADGE[attempt.status] ?? 'bg-slate-700 text-slate-400'}`}>
                    {attempt.status}
                  </span>
                  {attempt.started_at && (
                    <span className="text-xs text-slate-500">
                      {new Date(attempt.started_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {attempt.response_message && (
                  <p className="text-xs text-slate-400">{attempt.response_message}</p>
                )}
                {attempt.error_message && (
                  <p className="text-xs text-red-400">{attempt.error_message}</p>
                )}
                {attempt.executed_by_agent && (
                  <p className="text-xs text-slate-600 mt-1">Agent: {attempt.executed_by_agent}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="text-xs text-slate-500 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}
