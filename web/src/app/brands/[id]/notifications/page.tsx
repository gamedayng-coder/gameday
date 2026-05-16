import { redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { StaffNotification, StaffNotificationStatus } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const STATUS_COLOURS: Record<StaffNotificationStatus, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300',
  sent:      'bg-green-900/40 text-green-300',
  failed:    'bg-red-900/40 text-red-400',
  blocked:   'bg-orange-900/40 text-orange-300',
  cancelled: 'bg-slate-700 text-slate-500',
};

export default async function NotificationsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: notificationsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('staff_notifications')
      .select('*')
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (!brandData) redirect('/brands');

  const notifications = (notificationsData ?? []) as StaffNotification[];

  const pending = notifications.filter((n) => n.status === 'pending');
  const rest    = notifications.filter((n) => n.status !== 'pending');

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Notifications</h1>
      <p className="text-sm text-slate-500 mb-6">
        {brandData.name} · {notifications.length} record{notifications.length !== 1 ? 's' : ''}
      </p>

      {notifications.length === 0 ? (
        <p className="text-sm text-slate-500">No notification records.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pending</h2>
              <div className="space-y-2">
                {pending.map((n) => <NotificationRow key={n.id} n={n} />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent</h2>
              <div className="space-y-2">
                {rest.map((n) => <NotificationRow key={n.id} n={n} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotificationRow({ n }: { n: StaffNotification }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[n.status]}`}>
              {n.status}
            </span>
            <span className="text-xs text-slate-600">{n.channel}</span>
          </div>
          {n.subject && (
            <p className="text-sm font-medium text-slate-200 truncate">{n.subject}</p>
          )}
          <p className="text-sm text-slate-400 mt-0.5">{n.message_text}</p>
          {n.error_message && (
            <p className="text-xs text-red-400 mt-1">{n.error_message}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-600">{n.related_entity_type}</span>
            {n.sent_by_agent && (
              <span className="text-xs text-slate-600">· sent by {n.sent_by_agent}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-600">{new Date(n.created_at).toLocaleString()}</p>
          {n.sent_at && (
            <p className="text-xs text-slate-600 mt-0.5">
              sent {new Date(n.sent_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
