import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import { updateContentItem } from '../../../../../../lib/content-item-actions';
import type { ContentItem } from '../../../../../../db/schema';

export const dynamic = 'force-dynamic';

const CONTENT_TYPES = ['post', 'caption', 'article', 'thread', 'email', 'ad', 'other'];
const PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'telegram', 'email', 'web'];

type Props = { params: { id: string; itemId: string } };

export default async function EditContentPage({ params }: Props) {
  const { id: brandId, itemId } = params;

  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data } = await db
    .from('content_items')
    .select('*')
    .eq('id', itemId)
    .eq('brand_id', brandId)
    .maybeSingle();
  if (!data) notFound();

  const item = data as ContentItem;
  const action = updateContentItem.bind(null, brandId, itemId);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Edit content</h1>
        <p className="text-xs text-slate-500 mt-0.5">{item.title ?? 'Untitled'}</p>
      </div>

      <form action={action} className="space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="content_type">Content type</label>
          <select
            id="content_type"
            name="content_type"
            defaultValue={item.content_type}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="platform">Platform</label>
          <select
            id="platform"
            name="platform"
            defaultValue={item.platform ?? ''}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No specific platform</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={item.title ?? ''}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="body">Body</label>
          <textarea
            id="body"
            name="body"
            rows={10}
            defaultValue={item.body ?? ''}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="campaign_name">Campaign</label>
          <input
            id="campaign_name"
            name="campaign_name"
            type="text"
            defaultValue={item.campaign_name ?? ''}
            placeholder="Campaign name"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <a
            href={`/brands/${brandId}/content/${itemId}`}
            className="text-sm text-slate-400 hover:text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
