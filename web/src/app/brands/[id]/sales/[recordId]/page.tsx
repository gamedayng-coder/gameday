import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { SalesRecord } from '../../../../../db/schema';
import { updateSalesNotes } from '../../../../../lib/sales-record-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; recordId: string } };

export default async function SaleDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: recordData } = await db
    .from('sales_records')
    .select('*')
    .eq('id', params.recordId)
    .eq('brand_id', params.id)
    .maybeSingle();

  if (!recordData) redirect(`/brands/${params.id}/sales`);

  const record = recordData as SalesRecord;

  const saveNotes = updateSalesNotes.bind(null, params.id, params.recordId);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link
        href={`/brands/${params.id}/sales`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Sales
      </Link>

      <h1 className="text-xl font-bold text-slate-100 mb-6">
        {record.reference ?? 'Sale'}
      </h1>

      {/* Read-only detail card */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 mb-6 space-y-3">
        {record.total_amount != null && (
          <Row label="Amount">
            <span className="text-sm font-semibold text-slate-200">
              {record.currency} {Number(record.total_amount).toFixed(2)}
            </span>
          </Row>
        )}
        {record.reference && (
          <Row label="Reference">
            <span className="text-sm text-slate-300 font-mono">{record.reference}</span>
          </Row>
        )}
        {record.customer_record_id && (
          <Row label="Customer">
            <Link
              href={`/brands/${params.id}/customers/${record.customer_record_id}`}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              View customer →
            </Link>
          </Row>
        )}
        {record.booking_id && (
          <Row label="Booking">
            <Link
              href={`/brands/${params.id}/bookings/${record.booking_id}`}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              View booking →
            </Link>
          </Row>
        )}
        {record.created_by_agent && (
          <Row label="Created by">
            <span className="text-sm text-slate-400">{record.created_by_agent}</span>
          </Row>
        )}
        <Row label="Date">
          <span className="text-sm text-slate-400">{new Date(record.created_at).toLocaleString()}</span>
        </Row>
      </div>

      {/* Editable notes */}
      <form action={saveNotes} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 space-y-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={record.notes ?? ''}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            Save notes
          </button>
        </div>
      </form>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
