import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../../lib/supabase/service';
import { updateVariant, deleteVariant } from '../../../../../../../lib/content-variant-actions';
import type { ContentVariant } from '../../../../../../../db/schema';

export const dynamic = 'force-dynamic';

const VARIANT_STATUSES = ['draft', 'shortlisted', 'approved', 'rejected', 'archived'] as const;

type Props = { params: { id: string; itemId: string; variantId: string } };

export default async function VariantDetailPage({ params }: Props) {
  const { id: brandId, itemId, variantId } = params;

  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data } = await db
    .from('content_variants')
    .select('*')
    .eq('id', variantId)
    .eq('content_item_id', itemId)
    .maybeSingle();
  if (!data) notFound();

  const variant = data as ContentVariant;
  const updateAction = updateVariant.bind(null, brandId, itemId, variantId);
  const deleteAction = deleteVariant.bind(null, brandId, itemId, variantId);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-slate-500 mb-1">
            <a href={`/brands/${brandId}/content/${itemId}`} className="hover:text-slate-300 transition-colors">
              ← Back to content item
            </a>
          </p>
          <h1 className="text-xl font-bold text-slate-100">Variant: {variant.variant_label}</h1>
        </div>
        <form action={deleteAction}>
          <button
            type="submit"
            className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors"
          >
            Delete
          </button>
        </form>
      </div>

      <form action={updateAction} className="space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="variant_label">Variant label</label>
          <input
            id="variant_label"
            name="variant_label"
            type="text"
            required
            defaultValue={variant.variant_label}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={variant.status}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {VARIANT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={variant.title ?? ''}
            placeholder="Optional title for this variant"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="body">Body</label>
          <textarea
            id="body"
            name="body"
            rows={10}
            defaultValue={variant.body ?? ''}
            placeholder="Variant content body…"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-600"
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
            Save variant
          </button>
        </div>
      </form>

      <div className="mt-8 text-xs text-slate-600 space-y-0.5 border-t border-slate-800 pt-4">
        <p>Created {new Date(variant.created_at).toLocaleString()}</p>
        <p>Updated {new Date(variant.updated_at).toLocaleString()}</p>
        {variant.created_by_agent && <p>Agent: {variant.created_by_agent}</p>}
      </div>
    </div>
  );
}
