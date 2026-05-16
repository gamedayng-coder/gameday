import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { SalesRecord } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function SalesPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: recordsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('sales_records')
      .select('*')
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (!brandData) redirect('/brands');

  const records = (recordsData ?? []) as SalesRecord[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Sales</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {brandData.name} · {records.length} record{records.length !== 1 ? 's' : ''}
        </p>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-slate-500">No sales records.</p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/brands/${params.id}/sales/${r.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  {r.reference && (
                    <p className="text-xs text-slate-500 font-mono mb-1">{r.reference}</p>
                  )}
                  <div className="flex items-center gap-3">
                    {r.total_amount != null && (
                      <span className="text-sm font-semibold text-slate-200">
                        {r.currency} {Number(r.total_amount).toFixed(2)}
                      </span>
                    )}
                    {r.customer_record_id && (
                      <span className="text-xs text-slate-500">linked customer</span>
                    )}
                    {r.booking_id && (
                      <span className="text-xs text-slate-500">linked booking</span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-xs text-slate-600 mt-1 truncate max-w-sm">{r.notes}</p>
                  )}
                </div>
                <p className="text-xs text-slate-600 shrink-0 ml-4">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
