import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { Enquiry } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const STATUS_BADGE: Record<string, string> = {
  new:       'bg-blue-900 text-blue-300',
  triaged:   'bg-indigo-900 text-indigo-300',
  routed:    'bg-yellow-900 text-yellow-300',
  responded: 'bg-green-900 text-green-300',
  blocked:   'bg-red-900 text-red-300',
  closed:    'bg-slate-700 text-slate-500',
};

const OPEN_STATUSES = ['new', 'triaged', 'routed', 'blocked'];

export default async function InboxPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: enquiriesData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('enquiries')
      .select('*')
      .eq('brand_id', params.id)
      .in('status', OPEN_STATUSES)
      .order('created_at', { ascending: false }),
  ]);

  if (!brandData) redirect('/brands');

  const enquiries = (enquiriesData ?? []) as Enquiry[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Enquiries</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brandData.name} · open enquiries
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/inbox/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          New enquiry
        </Link>
      </div>

      {enquiries.length === 0 ? (
        <p className="text-sm text-slate-500">No open enquiries.</p>
      ) : (
        <div className="space-y-2">
          {enquiries.map((e) => (
            <Link
              key={e.id}
              href={`/brands/${params.id}/inbox/${e.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[e.status] ?? 'bg-slate-700 text-slate-400'}`}>
                      {e.status}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{e.channel}</span>
                    {e.enquiry_type && (
                      <span className="text-xs text-slate-600">{e.enquiry_type}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 truncate">
                    {e.subject ?? e.message_body ?? '(no subject)'}
                  </p>
                  {e.assigned_to_agent && (
                    <p className="text-xs text-slate-600 mt-0.5">→ {e.assigned_to_agent}</p>
                  )}
                </div>
                <span className="text-xs text-slate-600 shrink-0">
                  {new Date(e.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
