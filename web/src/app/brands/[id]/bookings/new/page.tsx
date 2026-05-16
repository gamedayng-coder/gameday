import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { CustomerRecord } from '../../../../../db/schema';
import { createBooking } from '../../../../../lib/booking-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const BOOKING_TYPES = ['appointment', 'event', 'service', 'consultation', 'class', 'other'];
const BOOKING_SOURCES = ['direct', 'phone', 'email', 'website', 'referral', 'social', 'other'];

export default async function NewBookingPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: customersData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('customer_records')
      .select('id, full_name, email')
      .eq('brand_id', params.id)
      .order('full_name', { ascending: true }),
  ]);

  if (!brandData) redirect('/brands');

  const customers = (customersData ?? []) as Pick<CustomerRecord, 'id' | 'full_name' | 'email'>[];
  const action    = createBooking.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link
        href={`/brands/${params.id}/bookings`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Bookings
      </Link>

      <h1 className="text-xl font-bold text-slate-100 mb-6">New booking</h1>

      <form action={action} className="space-y-5">

        {/* Customer */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Customer</label>
          <select
            name="customer_record_id"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— no customer linked —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? '(unnamed)'}
                {c.email ? ` · ${c.email}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Reference */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Reference <span className="text-slate-600">(auto-generated if blank)</span>
          </label>
          <input
            name="booking_reference"
            type="text"
            placeholder="BK-XXXXXXXX"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        {/* Type + Source */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Booking type</label>
            <select
              name="booking_type"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— select —</option>
              {BOOKING_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Source</label>
            <select
              name="source"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— select —</option>
              {BOOKING_SOURCES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Scheduled start</label>
            <input
              name="scheduled_start"
              type="datetime-local"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Scheduled end</label>
            <input
              name="scheduled_end"
              type="datetime-local"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Create booking
          </button>
          <Link
            href={`/brands/${params.id}/bookings`}
            className="text-sm text-slate-500 hover:text-slate-300 px-5 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
