import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { ContentItem, PlatformAccount } from '../../../../../../db/schema';
import { createPost } from '../../../../../../lib/post-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other'];

export default async function NewPostPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: contentData }, { data: accountsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('content_items')
      .select('id, title, content_type, platform')
      .eq('brand_id', params.id)
      .in('status', ['approved', 'scheduled'])
      .order('updated_at', { ascending: false })
      .limit(50),
    db.from('platform_accounts')
      .select('id, platform, account_name')
      .eq('brand_id', params.id)
      .order('platform'),
  ]);

  if (!brandData) redirect('/brands');

  const contentItems = (contentData ?? []) as Pick<ContentItem, 'id' | 'title' | 'content_type' | 'platform'>[];
  const accounts = (accountsData ?? []) as Pick<PlatformAccount, 'id' | 'platform' | 'account_name'>[];
  const action = createPost.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link
        href={`/brands/${params.id}/publishing/queue`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Publishing Queue
      </Link>

      <h1 className="text-xl font-bold text-slate-100 mb-6">New post</h1>

      <form action={action} className="space-y-5">

        {/* Platform */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Platform <span className="text-red-400">*</span></label>
          <select
            name="platform"
            required
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— select platform —</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Platform account */}
        {accounts.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 block mb-1">Platform account</label>
            <select
              name="platform_account_id"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— none —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} ({a.platform})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content item */}
        {contentItems.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 block mb-1">Link content item</label>
            <select
              name="content_item_id"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— none —</option>
              {contentItems.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title ?? '(untitled)'} · {c.content_type}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scheduled for */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Schedule for</label>
          <input
            name="scheduled_for"
            type="datetime-local"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Create post
          </button>
          <Link
            href={`/brands/${params.id}/publishing/queue`}
            className="text-sm text-slate-500 hover:text-slate-300 px-5 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
