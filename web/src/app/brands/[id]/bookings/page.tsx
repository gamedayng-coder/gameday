import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { Booking, BookingStatus } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string }; searchParams: { status?: string } };

const STATUS_GROUPS: { label: string; statuses: BookingStatus[] }[] = [
  { label: 'Active',    statuses: ['pending', 'confirmed'] },
  { label: 'Completed', statuses: ['completed', 'refunded'] },
  { label: 'Closed',    statuses: ['cancelled', 'disputed'] },
];

const STATUS_COLOURS: Record<BookingStatus, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300',
  confirmed: 'bg-green-900/40 text-green-300',
  completed: 'bg-slate-700 text-slate-300',
  cancelled: 'bg-red-900/40 text-red-400',
  refunded:  'bg-indigo-900/40 text-indigo-300',
  disputed:  'bg-orange-900/40 text-orange-300',
};

export default async function BookingsPage({ params, searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: bookingsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('bookings')
      .select('*')
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!brandData) redirect('/brands');

  const all = (bookingsData ?? []) as Booking[];
  const statusFilter = searchParams.status as BookingStatus | undefined;
  const bookings = statusFilter
    ? all.filter((b) => b.status === statusFilter)
    : all.filter((b) => ['pending', 'confirmed'].includes(b.status));

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brandData.name} · {all.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/brands/${params.id}/bookings/new`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            New booking
          </Link>
          <Link
            href={`/brands/${params.id}/bookings/calendar`}
            className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg px-4 py-2 transition-colors"
          >
            Calendar
          </Link>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-700 pb-2">
        <FilterTab href={`/brands/${params.id}/bookings`} active={!statusFilter} label="Active" />
        {STATUS_GROUPS.map((g) =>
          g.statuses.map((s) => (
            <FilterTab
              key={s}
              href={`/brands/${params.id}/bookings?status=${s}`}
              active={statusFilter === s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
            />
          ))
        )}
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-slate-500">No bookings found.</p>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${params.id}/bookings/${b.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[b.status as BookingStatus]}`}>
                      {b.status}
                    </span>
                    {b.booking_reference && (
                      <span className="text-xs text-slate-500 font-mono">{b.booking_reference}</span>
                    )}
                  </div>
                  {b.scheduled_start && (
                    <p className="text-sm text-slate-300">
                      {new Date(b.scheduled_start).toLocaleString()}
                      {b.scheduled_end && ` – ${new Date(b.scheduled_end).toLocaleString()}`}
                    </p>
                  )}
                  {b.notes && (
                    <p className="text-xs text-slate-500 mt-1 truncate max-w-sm">{b.notes}</p>
                  )}
                </div>
                <p className="text-xs text-slate-600 shrink-0 ml-4">
                  {new Date(b.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-slate-700 text-slate-100 font-medium'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </Link>
  );
}
