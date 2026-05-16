import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { Booking, BookingEvent, BookingLineItem, BookingStatus } from '../../../../../db/schema';
import {
  updateBookingStatus,
  updateBooking,
  addBookingLineItem,
  updateBookingLineItem,
  deleteBookingLineItem,
  addBookingEvent,
} from '../../../../../lib/booking-actions';
import { ALLOWED_TRANSITIONS } from '../../../../../lib/booking-constants';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; bookingId: string }; searchParams: { editItem?: string } };

const STATUS_COLOURS: Record<BookingStatus, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300',
  confirmed: 'bg-green-900/40 text-green-300',
  completed: 'bg-slate-700 text-slate-300',
  cancelled: 'bg-red-900/40 text-red-400',
  refunded:  'bg-indigo-900/40 text-indigo-300',
  disputed:  'bg-orange-900/40 text-orange-300',
};

const ITEM_TYPES = ['service', 'goods', 'package', 'fee', 'addon'];

const EVENT_TYPES = [
  'note', 'rescheduled', 'staffed', 'contacted', 'reminder', 'no_show', 'other',
];

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: bookingData }, { data: eventsData }, { data: lineItemsData }] = await Promise.all([
    db.from('bookings')
      .select('*')
      .eq('id', params.bookingId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('booking_events')
      .select('*')
      .eq('booking_id', params.bookingId)
      .order('created_at', { ascending: false }),
    db.from('booking_line_items')
      .select('*')
      .eq('booking_id', params.bookingId)
      .order('created_at', { ascending: true }),
  ]);

  if (!bookingData) redirect(`/brands/${params.id}/bookings`);

  const booking   = bookingData as Booking;
  const events    = (eventsData  ?? []) as BookingEvent[];
  const lineItems = (lineItemsData ?? []) as BookingLineItem[];

  const allowedNext = ALLOWED_TRANSITIONS[booking.status as BookingStatus] ?? [];
  const editItemId  = searchParams.editItem ?? null;

  const update       = updateBooking.bind(null, params.id, params.bookingId);
  const addEvent     = addBookingEvent.bind(null, params.id, params.bookingId);
  const addLineItem  = addBookingLineItem.bind(null, params.id, params.bookingId);

  const grandTotal = lineItems.reduce(
    (sum, item) => sum + (item.total_price != null ? Number(item.total_price) : 0),
    0,
  );

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/bookings`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Bookings
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[booking.status as BookingStatus]}`}>
          {booking.status}
        </span>
        {booking.booking_reference && (
          <span className="text-xs text-slate-500 font-mono">{booking.booking_reference}</span>
        )}
      </div>

      {/* Edit form */}
      <form action={update} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 space-y-3 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Start</label>
            <input
              name="scheduled_start"
              type="datetime-local"
              defaultValue={booking.scheduled_start ? booking.scheduled_start.slice(0, 16) : ''}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">End</label>
            <input
              name="scheduled_end"
              type="datetime-local"
              defaultValue={booking.scheduled_end ? booking.scheduled_end.slice(0, 16) : ''}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={booking.notes ?? ''}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </form>

      {/* Status transitions */}
      {allowedNext.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">Status</h2>
          <div className="flex flex-wrap gap-2">
            {allowedNext.map((next) => {
              const action = updateBookingStatus.bind(null, params.id, params.bookingId, next);
              return (
                <form key={next} action={action}>
                  <button className="text-xs px-3 py-1.5 border border-slate-600 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors capitalize">
                    Mark {next}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Line items</h2>
        <div className="border border-slate-700 rounded-xl overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-2">Item</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-2">Type</th>
                <th className="text-right text-xs text-slate-500 font-medium px-3 py-2">Qty</th>
                <th className="text-right text-xs text-slate-500 font-medium px-3 py-2">Unit £</th>
                <th className="text-right text-xs text-slate-500 font-medium px-3 py-2">Total £</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => {
                const isEditing = editItemId === item.id;
                if (isEditing) {
                  const save = updateBookingLineItem.bind(null, params.id, params.bookingId, item.id);
                  return (
                    <tr key={item.id} className="border-b border-slate-700/50 last:border-0 bg-indigo-950/30">
                      <td colSpan={6} className="px-4 py-3">
                        <form action={save} className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              name="item_name"
                              defaultValue={item.item_name}
                              placeholder="Item name"
                              required
                              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <select
                              name="item_type"
                              defaultValue={item.item_type}
                              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {ITEM_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              name="quantity"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={item.quantity}
                              placeholder="Qty"
                              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              name="unit_price"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={item.unit_price ?? ''}
                              placeholder="Unit price"
                              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              name="item_notes"
                              defaultValue={item.notes ?? ''}
                              placeholder="Notes (optional)"
                              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Save
                            </button>
                            <Link
                              href={`/brands/${params.id}/bookings/${params.bookingId}`}
                              className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                            >
                              Cancel
                            </Link>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                const deleteAction = deleteBookingLineItem.bind(null, params.id, params.bookingId, item.id);
                return (
                  <tr key={item.id} className="border-b border-slate-700/50 last:border-0 bg-slate-800/50">
                    <td className="px-4 py-2.5">
                      <p className="text-slate-200">{item.item_name}</p>
                      {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{item.item_type}</td>
                    <td className="px-3 py-2.5 text-slate-300 text-right text-xs">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-slate-400 text-right text-xs">
                      {item.unit_price != null ? item.unit_price : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 text-right text-xs font-medium">
                      {item.total_price != null ? item.total_price : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Link
                          href={`/brands/${params.id}/bookings/${params.bookingId}?editItem=${item.id}`}
                          className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors"
                        >
                          Edit
                        </Link>
                        <form action={deleteAction}>
                          <button
                            type="submit"
                            className="text-xs text-red-500/60 hover:text-red-400 px-2 py-1 rounded transition-colors"
                          >
                            Del
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-xs text-slate-600 text-center">
                    No line items yet.
                  </td>
                </tr>
              )}

              {/* Grand total row */}
              {lineItems.length > 0 && (
                <tr className="bg-slate-800 border-t border-slate-700">
                  <td colSpan={4} className="px-4 py-2 text-xs text-slate-500 text-right font-medium">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-slate-100">
                    £{grandTotal.toFixed(2)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add line item form */}
        <details className="group">
          <summary className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer list-none flex items-center gap-1 select-none">
            <span className="group-open:hidden">+ Add line item</span>
            <span className="hidden group-open:inline">− Add line item</span>
          </summary>
          <form action={addLineItem} className="mt-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                name="item_name"
                placeholder="Item name"
                required
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
              />
              <select
                name="item_type"
                defaultValue="service"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                name="quantity"
                type="number"
                step="0.01"
                min="0"
                defaultValue="1"
                placeholder="Qty"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                name="unit_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Unit price"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
              />
              <input
                name="item_notes"
                placeholder="Notes (optional)"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
              >
                Add item
              </button>
            </div>
          </form>
        </details>
      </div>

      {/* Event timeline */}
      <div className="border-t border-slate-700 pt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Timeline</h2>

        {events.length > 0 && (
          <div className="space-y-2 mb-4">
            {events.map((e) => (
              <div key={e.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-400 capitalize">{e.event_type}</span>
                  {e.from_status && e.to_status && (
                    <span className="text-xs text-slate-600">
                      {e.from_status} → {e.to_status}
                    </span>
                  )}
                  <span className="text-xs text-slate-600 ml-auto">
                    {e.metadata && typeof e.metadata === 'object' && 'occurred_at' in e.metadata
                      ? new Date(e.metadata.occurred_at as string).toLocaleString()
                      : new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                {e.event_text && (
                  <p className="text-sm text-slate-300">{e.event_text}</p>
                )}
                {e.created_by_agent && (
                  <p className="text-xs text-slate-600 mt-0.5">{e.created_by_agent}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Log event form */}
        <form action={addEvent} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              name="event_type"
              defaultValue="note"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
              ))}
            </select>
            <input
              name="occurred_at"
              type="datetime-local"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <input
              name="event_text"
              type="text"
              placeholder="Notes…"
              required
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
            />
            <button
              type="submit"
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Log event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
