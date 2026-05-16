import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createContentItem } from '../../../../../lib/content-item-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const CONTENT_TYPES = ['post', 'caption', 'article', 'thread', 'email', 'ad', 'other'];
const PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'telegram', 'email', 'web'];

export default async function NewContentPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const action = createContentItem.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">New content item</h1>
        <p className="text-sm text-slate-500 mt-0.5">Create a new draft content item for this brand.</p>
      </div>

      <form action={action} className="space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="content_type">
            Content type <span className="text-red-400">*</span>
          </label>
          <select
            id="content_type"
            name="content_type"
            required
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a type…</option>
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
            placeholder="Content title or headline"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="body">Body</label>
          <textarea
            id="body"
            name="body"
            rows={8}
            placeholder="Content body…"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="campaign_name">Campaign (optional)</label>
          <input
            id="campaign_name"
            name="campaign_name"
            type="text"
            placeholder="Campaign name — links this item to a campaign by name"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <a
            href={`/brands/${params.id}/content`}
            className="text-sm text-slate-400 hover:text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Create draft
          </button>
        </div>
      </form>
    </div>
  );
}
