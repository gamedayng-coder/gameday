import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { CustomerRecord } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function CustomersPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: customersData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('customer_records')
      .select('*')
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!brandData) redirect('/brands');

  const customers = (customersData ?? []) as CustomerRecord[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brandData.name} · {customers.length} record{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/customers/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          New customer
        </Link>
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-slate-500">No customer records.</p>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/brands/${params.id}/customers/${c.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {c.full_name ?? '(unnamed)'}
                  </p>
                  <div className="flex gap-3 mt-0.5">
                    {c.email && <span className="text-xs text-slate-500">{c.email}</span>}
                    {c.phone && <span className="text-xs text-slate-500">{c.phone}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {c.booking_count > 0 && (
                    <span className="text-xs text-slate-500">{c.booking_count} booking{c.booking_count !== 1 ? 's' : ''}</span>
                  )}
                  {c.last_interaction_at && (
                    <p className="text-xs text-slate-600">
                      Last: {new Date(c.last_interaction_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
