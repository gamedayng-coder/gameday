import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { CustomerRecord, CustomerNote, Enquiry } from '../../../../../db/schema';
import { updateCustomerRecord } from '../../../../../lib/customer-record-actions';
import { createNote, deleteNote } from '../../../../../lib/customer-note-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; customerId: string } };

export default async function CustomerDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: customerData }, { data: notesData }, { data: enquiriesData }] = await Promise.all([
    db.from('customer_records').select('*').eq('id', params.customerId).eq('brand_id', params.id).maybeSingle(),
    db.from('customer_notes')
      .select('*')
      .eq('customer_record_id', params.customerId)
      .order('created_at', { ascending: false }),
    db.from('enquiries')
      .select('id, subject, status, channel, created_at')
      .eq('customer_record_id', params.customerId)
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (!customerData) redirect(`/brands/${params.id}/customers`);

  const customer = customerData as CustomerRecord;
  const notes = (notesData ?? []) as CustomerNote[];
  const enquiries = (enquiriesData ?? []) as Pick<Enquiry, 'id' | 'subject' | 'status' | 'channel' | 'created_at'>[];

  const update = updateCustomerRecord.bind(null, params.id, params.customerId);
  const addNote = createNote.bind(null, params.id, params.customerId);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/customers`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Customers
      </Link>

      <h1 className="text-xl font-bold text-slate-100 mb-6">
        {customer.full_name ?? '(unnamed)'}
      </h1>

      {/* Edit form */}
      <form action={update} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 space-y-3 mb-6">
        <Field label="Full name" name="full_name" defaultValue={customer.full_name ?? ''} />
        <Field label="Email" name="email" type="email" defaultValue={customer.email ?? ''} />
        <Field label="Phone" name="phone" defaultValue={customer.phone ?? ''} />
        <div>
          <label className="text-xs text-slate-400 block mb-1">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={customer.notes ?? ''}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-600">
            {customer.booking_count} booking{customer.booking_count !== 1 ? 's' : ''}
            {customer.last_interaction_at && ` · Last interaction ${new Date(customer.last_interaction_at).toLocaleDateString()}`}
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </form>

      {/* Linked enquiries */}
      {enquiries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">Enquiries</h2>
          <div className="space-y-1">
            {enquiries.map((e) => (
              <Link
                key={e.id}
                href={`/brands/${params.id}/inbox/${e.id}`}
                className="flex items-center justify-between bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg px-4 py-2.5 transition-colors"
              >
                <span className="text-sm text-slate-300 truncate">{e.subject ?? '(no subject)'}</span>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-xs text-slate-500">{e.status}</span>
                  <span className="text-xs text-slate-600">{new Date(e.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Customer notes */}
      <div className="border-t border-slate-700 pt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Internal notes</h2>
        {notes.length > 0 && (
          <div className="space-y-2 mb-4">
            {notes.map((n) => {
              const del = deleteNote.bind(null, params.id, params.customerId, n.id);
              return (
                <div key={n.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-300">{n.note_text}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {n.created_by_agent} · {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={del}>
                    <button className="text-xs text-red-500 hover:text-red-400 shrink-0">Delete</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
        <form action={addNote} className="flex gap-2">
          <input
            name="note_text"
            type="text"
            placeholder="Add a note…"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
