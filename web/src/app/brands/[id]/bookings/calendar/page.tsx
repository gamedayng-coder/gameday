import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { CalendarEvent, CalendarEventStatus } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const STATUS_COLOURS: Record<CalendarEventStatus, string> = {
  scheduled: 'text-green-400',
  tentative: 'text-yellow-400',
  completed: 'text-slate-500',
  cancelled: 'text-red-400',
};

export default async function BookingsCalendarPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: eventsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('calendar_events')
      .select('*')
      .eq('brand_id', params.id)
      .in('status', ['scheduled', 'tentative'])
      .order('starts_at', { ascending: true })
      .limit(50),
  ]);

  if (!brandData) redirect('/brands');

  const events = (eventsData ?? []) as CalendarEvent[];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <Link
          href={`/brands/${params.id}/bookings`}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ← Bookings
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-100 mt-2 mb-1">Calendar</h1>
      <p className="text-sm text-slate-500 mb-6">
        {brandData.name} · upcoming events
      </p>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No upcoming calendar events.</p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${STATUS_COLOURS[e.status as CalendarEventStatus]}`}>
                      {e.status}
                    </span>
                    <span className="text-xs text-slate-600 capitalize">{e.event_type}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 truncate">{e.title}</p>
                  {e.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{e.description}</p>
                  )}
                  {e.location && (
                    <p className="text-xs text-slate-600 mt-0.5">{e.location}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {e.starts_at && (
                    <p className="text-xs text-slate-400">
                      {new Date(e.starts_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                  {e.ends_at && (
                    <p className="text-xs text-slate-600">
                      → {new Date(e.ends_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                  {e.booking_id && (
                    <Link
                      href={`/brands/${params.id}/bookings/${e.booking_id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
                    >
                      View booking →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
