import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { InventoryItem, InventoryItemStatus } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string }; searchParams: { status?: string } };

const STATUS_COLOURS: Record<InventoryItemStatus, string> = {
  active:      'bg-green-900/40 text-green-300',
  inactive:    'bg-slate-700 text-slate-400',
  archived:    'bg-slate-800 text-slate-600',
  out_of_stock: 'bg-red-900/40 text-red-400',
};

const STATUS_TABS: InventoryItemStatus[] = ['active', 'inactive', 'out_of_stock', 'archived'];

export default async function InventoryPage({ params, searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const statusFilter = (searchParams.status as InventoryItemStatus | undefined) ?? 'active';

  const [{ data: brandData }, { data: itemsData }, { data: alertsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('inventory_items')
      .select('*')
      .eq('brand_id', params.id)
      .eq('status', statusFilter)
      .order('name', { ascending: true }),
    db.from('inventory_alerts')
      .select('inventory_item_id')
      .eq('brand_id', params.id)
      .eq('status', 'active'),
  ]);

  if (!brandData) redirect('/brands');

  const items = (itemsData ?? []) as InventoryItem[];
  const alertItemIds = new Set((alertsData ?? []).map((a: { inventory_item_id: string }) => a.inventory_item_id));

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">{brandData.name}</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-700 pb-2">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/brands/${params.id}/inventory?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${
              statusFilter === s
                ? 'bg-slate-700 text-slate-100 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No items found.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/brands/${params.id}/inventory/${item.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[item.status as InventoryItemStatus]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    {alertItemIds.has(item.id) && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300">
                        alert
                      </span>
                    )}
                    {item.sku && (
                      <span className="text-xs text-slate-600 font-mono">{item.sku}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-200">{item.name}</p>
                  {item.category && (
                    <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold text-slate-200">{item.current_stock}</p>
                  <p className="text-xs text-slate-600">in stock</p>
                  {item.low_stock_threshold != null && Number(item.current_stock) <= Number(item.low_stock_threshold) && (
                    <p className="text-xs text-orange-400 mt-0.5">low stock</p>
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
