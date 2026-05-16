import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { SocialInteraction, ReplyDraft, SocialInteractionStatus } from '../../../../../../db/schema';
import { updateInteractionStatus, linkInteractionToThread } from '../../../../../../lib/social-interaction-actions';
import { createReplyDraft } from '../../../../../../lib/reply-draft-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; interactionId: string } };

const STATUSES: SocialInteractionStatus[] = ['new', 'triaged', 'responded', 'escalated', 'closed'];

export default async function InteractionDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: interactionData }, { data: draftsData }] = await Promise.all([
    db.from('social_interactions')
      .select('*')
      .eq('id', params.interactionId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('reply_drafts')
      .select('*')
      .eq('social_interaction_id', params.interactionId)
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!interactionData) redirect(`/brands/${params.id}/inbox/social`);

  const interaction = interactionData as SocialInteraction;
  const drafts = (draftsData ?? []) as ReplyDraft[];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/inbox/social`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Social interactions
      </Link>

      {/* Interaction detail */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-300 capitalize">{interaction.interaction_type}</span>
          <span className="text-xs text-slate-500 capitalize">{interaction.platform}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">
            {interaction.status}
          </span>
        </div>
        {interaction.author_handle && (
          <p className="text-xs text-slate-500 mb-1">@{interaction.author_handle} · {interaction.author_name}</p>
        )}
        {interaction.interaction_text && (
          <p className="text-sm text-slate-200 mb-3">{interaction.interaction_text}</p>
        )}
        {interaction.linked_thread_id && (
          <p className="text-xs text-indigo-400 mb-2">Linked to thread: {interaction.linked_thread_id}</p>
        )}
        <p className="text-xs text-slate-600">{new Date(interaction.created_at).toLocaleString()}</p>
      </div>

      {/* Status update */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Update status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.filter((s) => s !== interaction.status).map((s) => {
            const action = updateInteractionStatus.bind(null, params.id, params.interactionId, s);
            return (
              <form key={s} action={action}>
                <button className="text-xs px-3 py-1.5 border border-slate-600 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors capitalize">
                  Mark {s}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      {/* Reply drafts */}
      <div className="border-t border-slate-700 pt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Reply drafts</h2>
        {drafts.length > 0 && (
          <div className="space-y-2 mb-4">
            {drafts.map((d) => (
              <div key={d.id} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-500 font-medium">{d.status}</span>
                  <span className="text-xs text-slate-600">{d.reply_channel}</span>
                </div>
                <p className="text-sm text-slate-300">{d.draft_text}</p>
              </div>
            ))}
          </div>
        )}
        <form action={createReplyDraft.bind(null, params.id)} className="space-y-2">
          <input type="hidden" name="social_interaction_id" value={params.interactionId} />
          <input type="hidden" name="reply_channel" value={interaction.platform} />
          <textarea
            name="draft_text"
            rows={3}
            placeholder="Draft a reply…"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Save draft
          </button>
        </form>
      </div>
    </div>
  );
}
