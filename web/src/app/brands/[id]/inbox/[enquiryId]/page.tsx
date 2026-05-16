import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { Enquiry, ConversationThread, Message, ReplyDraft } from '../../../../../db/schema';
import { closeEnquiry } from '../../../../../lib/enquiry-actions';
import { sendMessage } from '../../../../../lib/message-actions';
import { createReplyDraft } from '../../../../../lib/reply-draft-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; enquiryId: string } };

const STATUS_BADGE: Record<string, string> = {
  new:       'bg-blue-900 text-blue-300',
  triaged:   'bg-indigo-900 text-indigo-300',
  routed:    'bg-yellow-900 text-yellow-300',
  responded: 'bg-green-900 text-green-300',
  blocked:   'bg-red-900 text-red-300',
  closed:    'bg-slate-700 text-slate-500',
};

const THREAD_STATUS_BADGE: Record<string, string> = {
  open:      'bg-green-900 text-green-300',
  waiting:   'bg-yellow-900 text-yellow-300',
  escalated: 'bg-red-900 text-red-300',
  resolved:  'bg-slate-700 text-slate-300',
  closed:    'bg-slate-700 text-slate-500',
};

const MSG_DIR: Record<string, string> = {
  inbound:  'bg-slate-700',
  outbound: 'bg-indigo-900/50',
  internal: 'bg-amber-900/30',
};

export default async function EnquiryDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: enquiryData }, { data: threadsData }, { data: draftsData }] = await Promise.all([
    db.from('enquiries').select('*').eq('id', params.enquiryId).eq('brand_id', params.id).maybeSingle(),
    db.from('conversation_threads')
      .select('*')
      .eq('enquiry_id', params.enquiryId)
      .eq('brand_id', params.id)
      .order('created_at', { ascending: true }),
    db.from('reply_drafts')
      .select('*')
      .eq('brand_id', params.id)
      .in('status', ['draft', 'in_review', 'approved'])
      .order('created_at', { ascending: false }),
  ]);

  if (!enquiryData) redirect(`/brands/${params.id}/inbox`);

  const enquiry = enquiryData as Enquiry;
  const threads = (threadsData ?? []) as ConversationThread[];

  // Fetch messages for all threads
  const threadIds = threads.map((t) => t.id);
  const { data: messagesData } = threadIds.length > 0
    ? await db.from('messages').select('*').in('thread_id', threadIds).order('created_at', { ascending: true })
    : { data: [] };
  const messages = (messagesData ?? []) as Message[];

  const drafts = ((draftsData ?? []) as ReplyDraft[]).filter(
    (d) => threads.some((t) => t.id === d.thread_id)
  );

  const close = closeEnquiry.bind(null, params.id, params.enquiryId);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/inbox`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Enquiries
      </Link>

      {/* Enquiry header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[enquiry.status] ?? 'bg-slate-700 text-slate-400'}`}>
              {enquiry.status}
            </span>
            <span className="text-xs text-slate-500 capitalize">{enquiry.channel}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">
            {enquiry.subject ?? '(no subject)'}
          </h1>
          {enquiry.message_body && (
            <p className="text-sm text-slate-400 mt-1">{enquiry.message_body}</p>
          )}
          {enquiry.assigned_to_agent && (
            <p className="text-xs text-slate-600 mt-1">Assigned to: {enquiry.assigned_to_agent}</p>
          )}
        </div>
        {enquiry.status !== 'closed' && (
          <form action={close}>
            <button className="border border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              Close enquiry
            </button>
          </form>
        )}
      </div>

      {/* Conversation threads */}
      {threads.length === 0 ? (
        <p className="text-sm text-slate-500 mb-6">No conversation threads linked to this enquiry.</p>
      ) : (
        <div className="space-y-6 mb-8">
          {threads.map((thread) => {
            const threadMessages = messages.filter((m) => m.thread_id === thread.id);
            const sendAction = sendMessage.bind(null, params.id, params.enquiryId, thread.id);

            return (
              <div key={thread.id} className="border border-slate-700 rounded-xl overflow-hidden">
                {/* Thread header */}
                <div className="bg-slate-800 px-5 py-3 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      {thread.subject ?? thread.channel}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${THREAD_STATUS_BADGE[thread.status] ?? 'bg-slate-700 text-slate-400'}`}>
                      {thread.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600">{thread.channel}</span>
                </div>

                {/* Messages */}
                <div className="divide-y divide-slate-700/50">
                  {threadMessages.map((msg) => (
                    <div key={msg.id} className={`px-5 py-3 ${MSG_DIR[msg.direction] ?? ''}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-400 capitalize">{msg.direction}</span>
                        {msg.sender_name && (
                          <span className="text-xs text-slate-500">{msg.sender_name}</span>
                        )}
                        {msg.sent_at && (
                          <span className="text-xs text-slate-600">
                            {new Date(msg.sent_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-200">{msg.message_text}</p>
                    </div>
                  ))}
                </div>

                {/* Send message form */}
                <div className="bg-slate-800/50 px-5 py-3 border-t border-slate-700">
                  <form action={sendAction} className="flex gap-2">
                    <input
                      name="message_text"
                      type="text"
                      placeholder="Send a reply…"
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply draft panel */}
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
        {threads.length > 0 && (
          <form action={createReplyDraft.bind(null, params.id)} className="space-y-2">
            <input type="hidden" name="thread_id" value={threads[0].id} />
            <input type="hidden" name="enquiry_id" value={params.enquiryId} />
            <input type="hidden" name="reply_channel" value={threads[0].channel} />
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
        )}
      </div>
    </div>
  );
}
