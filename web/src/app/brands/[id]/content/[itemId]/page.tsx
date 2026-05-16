import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { deleteContentItem, updateContentItemStatus } from '../../../../../lib/content-item-actions';
import { createReview } from '../../../../../lib/content-review-actions';
import { createVariant } from '../../../../../lib/content-variant-actions';
import type {
  ContentItem, ContentVariant, ContentReview, Approval,
} from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

const ITEM_STATUS_STYLES: Record<string, string> = {
  draft:      'bg-slate-600 text-slate-200',
  in_review:  'bg-yellow-900 text-yellow-300',
  approved:   'bg-green-900 text-green-300',
  rejected:   'bg-red-900 text-red-300',
  scheduled:  'bg-blue-900 text-blue-300',
  published:  'bg-emerald-900 text-emerald-300',
  archived:   'bg-slate-700 text-slate-500',
};

const VARIANT_STATUS_STYLES: Record<string, string> = {
  draft:       'bg-slate-600 text-slate-300',
  shortlisted: 'bg-blue-900 text-blue-300',
  approved:    'bg-green-900 text-green-300',
  rejected:    'bg-red-900 text-red-300',
  archived:    'bg-slate-700 text-slate-500',
};

const REVIEW_STATUS_STYLES: Record<string, string> = {
  requested_changes:       'bg-yellow-900 text-yellow-300',
  approved_for_next_stage: 'bg-green-900 text-green-300',
  rejected:                'bg-red-900 text-red-300',
};

const APPROVAL_STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-900 text-yellow-300',
  approved:  'bg-green-900 text-green-300',
  rejected:  'bg-red-900 text-red-300',
  cancelled: 'bg-slate-700 text-slate-400',
};

type Props = { params: { id: string; itemId: string } };

export default async function ContentDetailPage({ params }: Props) {
  const { id: brandId, itemId } = params;

  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [
    { data: itemData },
    { data: variantsData },
    { data: reviewsData },
    { data: approvalsData },
  ] = await Promise.all([
    db.from('content_items').select('*').eq('id', itemId).eq('brand_id', brandId).maybeSingle(),
    db.from('content_variants').select('*').eq('content_item_id', itemId).order('created_at', { ascending: false }),
    db.from('content_reviews').select('*').eq('content_item_id', itemId).order('created_at', { ascending: false }),
    db.from('approvals').select('*').eq('entity_type', 'content_item').eq('entity_id', itemId).order('requested_at', { ascending: false }),
  ]);

  if (!itemData) notFound();

  const item = itemData as ContentItem;
  const variants = (variantsData ?? []) as ContentVariant[];
  const reviews = (reviewsData ?? []) as ContentReview[];
  const approvals = (approvalsData ?? []) as Approval[];

  const deleteAction = deleteContentItem.bind(null, brandId, itemId);
  const markInReview  = updateContentItemStatus.bind(null, brandId, itemId, 'in_review');
  const markApproved  = updateContentItemStatus.bind(null, brandId, itemId, 'approved');
  const markArchived  = updateContentItemStatus.bind(null, brandId, itemId, 'archived');
  const addReview     = createReview.bind(null, brandId, itemId);
  const addVariant    = createVariant.bind(null, brandId, itemId);

  return (
    <div className="px-8 py-8 max-w-3xl space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${ITEM_STATUS_STYLES[item.status] ?? 'bg-slate-600 text-slate-200'}`}>
              {item.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-500">{item.content_type}{item.platform ? ` · ${item.platform}` : ''}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">
            {item.title ?? <span className="text-slate-500 italic">Untitled</span>}
          </h1>
          {item.campaign_name && (
            <p className="text-xs text-slate-500 mt-1">Campaign: {item.campaign_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/brands/${brandId}/content/${itemId}/edit`}
            className="text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Edit
          </Link>
          <form action={deleteAction}>
            <button
              type="submit"
              className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors"
              onClick={(e) => { if (!confirm('Delete this content item?')) e.preventDefault(); }}
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Body */}
      {item.body && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Body</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {item.body}
          </div>
        </section>
      )}

      {/* Status transitions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Status</h2>
        <div className="flex flex-wrap gap-2">
          {item.status !== 'in_review' && (
            <form action={markInReview}>
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/70 border border-yellow-900 transition-colors">
                Mark in review
              </button>
            </form>
          )}
          {item.status !== 'approved' && (
            <form action={markApproved}>
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-green-900/40 text-green-300 hover:bg-green-900/70 border border-green-900 transition-colors">
                Mark approved
              </button>
            </form>
          )}
          {item.status !== 'archived' && (
            <form action={markArchived}>
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 border border-slate-600 transition-colors">
                Archive
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Variants */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Variants ({variants.length})
          </h2>
        </div>

        {variants.length > 0 && (
          <ul className="space-y-2 mb-4">
            {variants.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/brands/${brandId}/content/${itemId}/variants/${v.id}`}
                  className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 hover:border-slate-600 transition-colors"
                >
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${VARIANT_STATUS_STYLES[v.status] ?? 'bg-slate-600 text-slate-300'}`}>
                    {v.status}
                  </span>
                  <span className="text-sm text-slate-300 font-medium">{v.variant_label}</span>
                  {v.title && <span className="text-xs text-slate-500 truncate">{v.title}</span>}
                  <span className="ml-auto text-xs text-slate-600">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <form action={addVariant} className="flex gap-2">
          <input
            name="variant_label"
            type="text"
            required
            placeholder="Variant label (e.g. A, B, short-form)"
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            + Add variant
          </button>
        </form>
      </section>

      {/* Review panel */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Editorial reviews ({reviews.length})
        </h2>

        {reviews.length > 0 && (
          <ul className="space-y-2 mb-4">
            {reviews.map((r) => (
              <li key={r.id} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${REVIEW_STATUS_STYLES[r.review_status] ?? 'bg-slate-600 text-slate-300'}`}>
                    {r.review_status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-500">by {r.reviewer_agent} · {new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.notes && <p className="text-sm text-slate-300 mt-1">{r.notes}</p>}
              </li>
            ))}
          </ul>
        )}

        <form action={addReview} className="space-y-2">
          <select
            name="review_status"
            required
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select review outcome…</option>
            <option value="requested_changes">Requested changes</option>
            <option value="approved_for_next_stage">Approved for next stage</option>
            <option value="rejected">Rejected</option>
          </select>
          <textarea
            name="notes"
            rows={2}
            placeholder="Review notes (optional)"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-600"
          />
          <div className="flex justify-end">
            <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-4 py-2 rounded-lg transition-colors">
              Submit review
            </button>
          </div>
        </form>
      </section>

      {/* Approvals panel */}
      {approvals.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Approvals ({approvals.length})
          </h2>
          <ul className="space-y-2">
            {approvals.map((a) => (
              <li key={a.id} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${APPROVAL_STATUS_STYLES[a.status] ?? 'bg-slate-600 text-slate-300'}`}>
                    {a.status}
                  </span>
                  <span className="text-xs text-slate-500">{a.approval_type}</span>
                  {a.requested_by_agent && (
                    <span className="text-xs text-slate-600">requested by {a.requested_by_agent}</span>
                  )}
                </div>
                {a.decision_notes && <p className="text-sm text-slate-300 mt-1">{a.decision_notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Metadata */}
      <section className="text-xs text-slate-600 space-y-0.5 border-t border-slate-800 pt-4">
        <p>Created {new Date(item.created_at).toLocaleString()}</p>
        <p>Updated {new Date(item.updated_at).toLocaleString()}</p>
        {item.source_type !== 'manual' && <p>Source: {item.source_type}{item.source_ref ? ` — ${item.source_ref}` : ''}</p>}
        {item.created_by_agent && <p>Agent: {item.created_by_agent}</p>}
      </section>
    </div>
  );
}
